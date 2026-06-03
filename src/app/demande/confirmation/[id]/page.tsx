import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_type, status, quantity, delivery_name, delivery_address, delivery_phone, buyer_note, buyer_id, products(title), service_listings(title), profiles!seller_id(phone, full_name)')
    .eq('id', id)
    .single()

  if (!order || order.buyer_id !== user.id) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">Demande introuvable</h1>
          <Link href="/mes-demandes" className="block mt-4 text-sm text-blue-600 hover:underline">← Mes demandes</Link>
        </div>
      </main>
    )
  }

  const isProduct = order.order_type === 'product'
  const itemTitle = isProduct
    ? (order.products as unknown as { title: string } | null)?.title
    : (order.service_listings as unknown as { title: string } | null)?.title
  const seller = order.profiles as unknown as { phone: string | null; full_name: string } | null
  const sellerPhone = seller?.phone?.replace(/\s+/g, '') ?? null

  const waMessage = isProduct
    ? `Bonjour, je suis intéressé(e) par votre produit «${itemTitle}» sur Servyou. Je souhaite passer une commande en paiement à la livraison.`
    : `Bonjour, je suis intéressé(e) par votre service «${itemTitle}» sur Servyou.`

  const waUrl = sellerPhone
    ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(waMessage)}`
    : null

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Demande envoyée !</h1>
          <p className="text-gray-600 mb-6">
            Pour finaliser, contactez le vendeur via WhatsApp.
          </p>

          <div className="space-y-2 text-sm text-gray-700 mb-6">
            <div><span className="font-medium text-gray-500">Type :</span> {isProduct ? 'Produit' : 'Service'}</div>
            <div><span className="font-medium text-gray-500">Article :</span> {itemTitle}</div>
            {isProduct && order.quantity && (
              <div><span className="font-medium text-gray-500">Quantité :</span> {order.quantity}</div>
            )}
            {isProduct && order.delivery_name && (
              <div><span className="font-medium text-gray-500">Livraison à :</span> {order.delivery_name}</div>
            )}
            {isProduct && order.delivery_address && (
              <div><span className="font-medium text-gray-500">Adresse :</span> {order.delivery_address}</div>
            )}
            {isProduct && order.delivery_phone && (
              <div><span className="font-medium text-gray-500">Téléphone :</span> {order.delivery_phone}</div>
            )}
            {order.buyer_note && (
              <div><span className="font-medium text-gray-500">Note :</span> {order.buyer_note}</div>
            )}
            <div>
              <span className="font-medium text-gray-500">Statut :</span>{' '}
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">En attente</span>
            </div>
          </div>

          {waUrl ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded text-base transition-colors">
              Contacter le vendeur sur WhatsApp
            </a>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-4 py-3">
              Le vendeur n'a pas encore ajouté de numéro WhatsApp. Votre demande lui a été notifiée et il vous contactera dès que possible.
            </p>
          )}
        </div>

        <div className="flex gap-4 text-sm">
          <Link href="/mes-demandes" className="text-blue-600 hover:underline">Mes demandes</Link>
          <Link href="/" className="text-blue-600 hover:underline">← Retour à l'accueil</Link>
        </div>
      </div>
    </main>
  )
}
