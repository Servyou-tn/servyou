'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import {
  SHOP_TYPES,
  DELIVERY_SETUPS,
  PAYMENT_METHODS,
  shopTypeLabelKey,
  deliverySetupLabelKey,
  paymentMethodLabelKey,
  type Shop,
  type ShopType,
  type DeliverySetup,
  type PaymentMethod,
  type CategoryRow,
} from '@/lib/types/shop-config'

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
]

type Props = {
  mode: 'create' | 'edit'
  initialShop?: Shop
  initialPaymentMethods?: PaymentMethod[]
  initialCategoryIds?: string[]
  allCategories: CategoryRow[]
  onSuccess: (shopId: string) => void
}

export function ShopForm({
  mode,
  initialShop,
  initialPaymentMethods = [],
  initialCategoryIds = [],
  allCategories,
  onSuccess,
}: Props) {
  const supabase = createClient()
  const lang = useLang()

  // Scalar fields (10)
  const [name, setName] = useState(initialShop?.name ?? '')
  const [description, setDescription] = useState(initialShop?.description ?? '')
  const [city, setCity] = useState(initialShop?.city ?? '')
  const [logoUrl, setLogoUrl] = useState(initialShop?.logo_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(initialShop?.banner_url ?? '')
  const [shopType, setShopType] = useState<ShopType | ''>(initialShop?.shop_type ?? '')
  const [deliverySetup, setDeliverySetup] = useState<DeliverySetup | ''>(initialShop?.delivery_setup ?? '')
  const [workingHours, setWorkingHours] = useState(initialShop?.working_hours ?? '')
  const [locationDetail, setLocationDetail] = useState(initialShop?.location_detail ?? '')
  const [preferredCarriers, setPreferredCarriers] = useState(initialShop?.preferred_carriers ?? '')

  // Child-table selections
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>(initialPaymentMethods)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategoryIds)

  const [saving, setSaving] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const saveErrorKey = mode === 'create' ? 'boutique.error_create' : 'boutique.error_save'

  function toggleMethod(m: PaymentMethod) {
    setSelectedMethods(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]))
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorKey(null)

    if (!name.trim()) { setErrorKey('boutique.error_name'); return }
    if (!city) { setErrorKey('boutique.error_city'); return }

    setSaving(true)

    const scalarPayload = {
      name: name.trim(),
      description: description.trim() || null,
      city,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      shop_type: shopType || null,
      delivery_setup: deliverySetup || null,
      working_hours: workingHours.trim() || null,
      location_detail: locationDetail.trim() || null,
      preferred_carriers: preferredCarriers.trim() || null,
    }

    let shopId: string

    if (mode === 'create') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { console.error('[ShopForm] no authenticated user on create'); setErrorKey(saveErrorKey); setSaving(false); return }

      const { data, error } = await supabase
        .from('shops')
        .insert({ owner_id: user.id, ...scalarPayload })
        .select('id')
        .single()
      if (error || !data) { console.error('[ShopForm] shop insert error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
      shopId = data.id
    } else {
      const { error } = await supabase
        .from('shops')
        .update(scalarPayload)
        .eq('id', initialShop!.id)
      if (error) { console.error('[ShopForm] shop update error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
      shopId = initialShop!.id
    }

    // Diff payment methods against the initial set
    const toInsertMethods = selectedMethods.filter(m => !initialPaymentMethods.includes(m))
    const toDeleteMethods = initialPaymentMethods.filter(m => !selectedMethods.includes(m))
    if (toInsertMethods.length) {
      const { error } = await supabase
        .from('shop_payment_methods')
        .insert(toInsertMethods.map(method => ({ shop_id: shopId, method, note: null })))
      if (error) { console.error('[ShopForm] payment method insert error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
    }
    if (toDeleteMethods.length) {
      const { error } = await supabase
        .from('shop_payment_methods')
        .delete()
        .eq('shop_id', shopId)
        .in('method', toDeleteMethods)
      if (error) { console.error('[ShopForm] payment method delete error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
    }

    // Diff categories against the initial set
    const toInsertCategories = selectedCategoryIds.filter(id => !initialCategoryIds.includes(id))
    const toDeleteCategories = initialCategoryIds.filter(id => !selectedCategoryIds.includes(id))
    if (toInsertCategories.length) {
      const { error } = await supabase
        .from('shop_categories')
        .insert(toInsertCategories.map(category_id => ({ shop_id: shopId, category_id })))
      if (error) { console.error('[ShopForm] category insert error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
    }
    if (toDeleteCategories.length) {
      const { error } = await supabase
        .from('shop_categories')
        .delete()
        .eq('shop_id', shopId)
        .in('category_id', toDeleteCategories)
      if (error) { console.error('[ShopForm] category delete error:', error); setErrorKey(saveErrorKey); setSaving(false); return }
    }

    setSaving(false)
    onSuccess(shopId)
  }

  const sectionCls = 'space-y-4 border-t border-gray-100 pt-5'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errorKey && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {t(errorKey, lang)}
        </p>
      )}

      {/* Section 1 — Essentiels */}
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="name">
            {t('boutique.field_name', lang)} <span className="text-red-500">*</span>
          </label>
          <input id="name" type="text" required value={name}
            onChange={e => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="description">
            {t('boutique.field_description', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
          </label>
          <textarea id="description" rows={3} value={description}
            onChange={e => setDescription(e.target.value)} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls} htmlFor="city">
            {t('boutique.field_governorate', lang)} <span className="text-red-500">*</span>
          </label>
          <select id="city" required value={city} onChange={e => setCity(e.target.value)}
            className={`${inputCls} bg-white`}>
            <option value="">{t('signup.city_placeholder', lang)}</option>
            {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Section 2 — Visuels */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="logoUrl">
            {t('boutique.field_logo', lang)} <span className="text-gray-400 font-normal">{t('common.optional_m', lang)}</span>
          </label>
          <input id="logoUrl" type="url" value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">{t('boutique.image_url_hint', lang)}</p>
        </div>
        <div>
          <label className={labelCls} htmlFor="bannerUrl">
            {t('boutique.field_banner', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
          </label>
          <input id="bannerUrl" type="url" value={bannerUrl}
            onChange={e => setBannerUrl(e.target.value)} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">{t('boutique.image_url_hint', lang)}</p>
        </div>
      </div>

      {/* Section 3 — Type et livraison */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="shopType">{t('boutique.field_shop_type', lang)}</label>
          <select id="shopType" value={shopType}
            onChange={e => setShopType(e.target.value as ShopType | '')} className={`${inputCls} bg-white`}>
            <option value="">{t('boutique.placeholder_shop_type', lang)}</option>
            {SHOP_TYPES.map(type => (
              <option key={type} value={type}>{t(shopTypeLabelKey(type), lang)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="deliverySetup">{t('boutique.field_delivery_setup', lang)}</label>
          <select id="deliverySetup" value={deliverySetup}
            onChange={e => setDeliverySetup(e.target.value as DeliverySetup | '')} className={`${inputCls} bg-white`}>
            <option value="">{t('boutique.placeholder_delivery_setup', lang)}</option>
            {DELIVERY_SETUPS.map(setup => (
              <option key={setup} value={setup}>{t(deliverySetupLabelKey(setup), lang)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="preferredCarriers">{t('boutique.field_preferred_carriers', lang)}</label>
          <textarea id="preferredCarriers" rows={2} value={preferredCarriers}
            onChange={e => setPreferredCarriers(e.target.value)}
            placeholder={t('boutique.hint_preferred_carriers', lang)} className={`${inputCls} resize-none`} />
        </div>
      </div>

      {/* Section 4 — Horaires et localisation */}
      <div className={sectionCls}>
        <div>
          <label className={labelCls} htmlFor="workingHours">{t('boutique.field_working_hours', lang)}</label>
          <input id="workingHours" type="text" value={workingHours}
            onChange={e => setWorkingHours(e.target.value)}
            placeholder={t('boutique.hint_working_hours', lang)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="locationDetail">{t('boutique.field_location_detail', lang)}</label>
          <input id="locationDetail" type="text" value={locationDetail}
            onChange={e => setLocationDetail(e.target.value)}
            placeholder={t('boutique.hint_location_detail', lang)} className={inputCls} />
        </div>
      </div>

      {/* Section 5 — Modes de paiement */}
      <div className={sectionCls}>
        <p className="text-sm font-medium text-gray-700">{t('boutique.field_payment_methods', lang)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(m => (
            <label key={m} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={selectedMethods.includes(m)}
                onChange={() => toggleMethod(m)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              {t(paymentMethodLabelKey(m), lang)}
            </label>
          ))}
        </div>
      </div>

      {/* Section 6 — Spécialités */}
      <div className={sectionCls}>
        <p className="text-sm font-medium text-gray-700">{t('boutique.field_category_specialties', lang)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {allCategories.map(c => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={selectedCategoryIds.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              {c.name_fr}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
        {saving
          ? (mode === 'create' ? t('common.creating', lang) : t('common.saving', lang))
          : (mode === 'create' ? t('boutique.action_create', lang) : t('boutique.action_save', lang))}
      </button>
    </form>
  )
}
