// Generated from the live Supabase schema (project xggomcitqrkaylqezjjz) — DO NOT EDIT BY HAND.
// Regenerate after every applied migration: Supabase MCP generate_typescript_types (or
// `npx supabase gen types typescript --project-id xggomcitqrkaylqezjjz`), then commit.
// Generated 2026-10-25 after migration 20261025213214 prelaunch_shop_read_rls (policies only: body unchanged).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          note: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          note?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          note?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          kind: string
          name_ar: string
          name_fr: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name_ar: string
          name_fr: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name_ar?: string
          name_fr?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          export_url: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          export_url?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          export_url?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_note: string | null
          created_at: string
          created_by_role: string
          description: string | null
          id: string
          order_id: string
          outcome: string | null
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          created_by_role: string
          description?: string | null
          id?: string
          order_id: string
          outcome?: string | null
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          created_by_role?: string
          description?: string | null
          id?: string
          order_id?: string
          outcome?: string | null
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_type: string
          product_id: string | null
          service_listing_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          product_id?: string | null
          service_listing_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          product_id?: string | null
          service_listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_service_listing_id_fkey"
            columns: ["service_listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_certifications: {
        Row: {
          created_at: string
          credential_url: string | null
          freelancer_id: string
          id: string
          issuing_org: string | null
          name: string
          year_obtained: number | null
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          freelancer_id: string
          id?: string
          issuing_org?: string | null
          name: string
          year_obtained?: number | null
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          freelancer_id?: string
          id?: string
          issuing_org?: string | null
          name?: string
          year_obtained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_certifications_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_education: {
        Row: {
          created_at: string
          degree: string | null
          field: string | null
          freelancer_id: string
          id: string
          institution: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          created_at?: string
          degree?: string | null
          field?: string | null
          freelancer_id: string
          id?: string
          institution: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          created_at?: string
          degree?: string | null
          field?: string | null
          freelancer_id?: string
          id?: string
          institution?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_education_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_languages: {
        Row: {
          created_at: string
          freelancer_profile_id: string
          id: string
          language: string
          proficiency: string
        }
        Insert: {
          created_at?: string
          freelancer_profile_id: string
          id?: string
          language: string
          proficiency: string
        }
        Update: {
          created_at?: string
          freelancer_profile_id?: string
          id?: string
          language?: string
          proficiency?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_languages_freelancer_profile_id_fkey"
            columns: ["freelancer_profile_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_links: {
        Row: {
          created_at: string
          display_order: number
          freelancer_profile_id: string
          id: string
          label: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          freelancer_profile_id: string
          id?: string
          label: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          freelancer_profile_id?: string
          id?: string
          label?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_links_freelancer_profile_id_fkey"
            columns: ["freelancer_profile_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          freelancer_profile_id: string
          id: string
          image_url: string
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          freelancer_profile_id: string
          id?: string
          image_url: string
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          freelancer_profile_id?: string
          id?: string
          image_url?: string
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_portfolio_items_freelancer_profile_id_fkey"
            columns: ["freelancer_profile_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_profiles: {
        Row: {
          admin_hidden_at: string | null
          admin_hidden_reason: string | null
          bio: string | null
          city: string | null
          created_at: string
          current_workplace: string | null
          headline: string | null
          id: string
          is_published: boolean
          languages: string | null
          portfolio_link: string | null
          preferred_payment_method: string | null
          profile_id: string
          updated_at: string
          working_hours: string | null
          workplace_location: string | null
          years_experience: number | null
        }
        Insert: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          current_workplace?: string | null
          headline?: string | null
          id?: string
          is_published?: boolean
          languages?: string | null
          portfolio_link?: string | null
          preferred_payment_method?: string | null
          profile_id: string
          updated_at?: string
          working_hours?: string | null
          workplace_location?: string | null
          years_experience?: number | null
        }
        Update: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          current_workplace?: string | null
          headline?: string | null
          id?: string
          is_published?: boolean
          languages?: string | null
          portfolio_link?: string | null
          preferred_payment_method?: string | null
          profile_id?: string
          updated_at?: string
          working_hours?: string | null
          workplace_location?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_skills: {
        Row: {
          created_at: string
          freelancer_profile_id: string
          id: string
          skill: string
        }
        Insert: {
          created_at?: string
          freelancer_profile_id: string
          id?: string
          skill: string
        }
        Update: {
          created_at?: string
          freelancer_profile_id?: string
          id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_skills_freelancer_profile_id_fkey"
            columns: ["freelancer_profile_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_tools: {
        Row: {
          created_at: string
          freelancer_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          freelancer_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          freelancer_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_tools_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_post_skills: {
        Row: {
          created_at: string
          id: string
          job_post_id: string
          skill: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_post_id: string
          skill: string
        }
        Update: {
          created_at?: string
          id?: string
          job_post_id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_post_skills_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          admin_hidden_at: string | null
          admin_hidden_reason: string | null
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          city: string | null
          consumer_id: string
          created_at: string
          deadline: string | null
          description: string
          id: string
          is_remote: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          city?: string | null
          consumer_id: string
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          is_remote?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          city?: string | null
          consumer_id?: string
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          is_remote?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posts_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posts_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_responses: {
        Row: {
          created_at: string
          freelancer_id: string
          id: string
          job_post_id: string
          proposal_message: string | null
        }
        Insert: {
          created_at?: string
          freelancer_id: string
          id?: string
          job_post_id: string
          proposal_message?: string | null
        }
        Update: {
          created_at?: string
          freelancer_id?: string
          id?: string
          job_post_id?: string
          proposal_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_responses_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_responses_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_responses_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_note: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          carrier: string | null
          created_at: string
          delivery_address: string | null
          delivery_fee_tnd: number | null
          delivery_name: string | null
          delivery_phone: string | null
          id: string
          item_title: string | null
          order_type: string
          product_id: string | null
          quantity: number
          received_at: string | null
          seller_id: string
          service_listing_id: string | null
          status: string
          tracking_number: string | null
          unit_price_tnd: number | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_note?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          carrier?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee_tnd?: number | null
          delivery_name?: string | null
          delivery_phone?: string | null
          id?: string
          item_title?: string | null
          order_type: string
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          seller_id: string
          service_listing_id?: string | null
          status?: string
          tracking_number?: string | null
          unit_price_tnd?: number | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_note?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          carrier?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee_tnd?: number | null
          delivery_name?: string | null
          delivery_phone?: string | null
          id?: string
          item_title?: string | null
          order_type?: string
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          seller_id?: string
          service_listing_id?: string | null
          status?: string
          tracking_number?: string | null
          unit_price_tnd?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_listing_id_fkey"
            columns: ["service_listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          admin_hidden_at: string | null
          admin_hidden_reason: string | null
          category_id: string | null
          created_at: string
          delivery_fee_tnd: number
          description: string | null
          id: string
          price_tnd: number
          search_vector: unknown
          shop_id: string
          status: string
          stock_count: number | null
          title: string
          tracks_stock: boolean
          updated_at: string
        }
        Insert: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          category_id?: string | null
          created_at?: string
          delivery_fee_tnd?: number
          description?: string | null
          id?: string
          price_tnd: number
          search_vector?: unknown
          shop_id: string
          status?: string
          stock_count?: number | null
          title: string
          tracks_stock?: boolean
          updated_at?: string
        }
        Update: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          category_id?: string | null
          created_at?: string
          delivery_fee_tnd?: number
          description?: string | null
          id?: string
          price_tnd?: number
          search_vector?: unknown
          shop_id?: string
          status?: string
          stock_count?: number | null
          title?: string
          tracks_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          language: string
          phone: string | null
          seller_type: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth: string
          email: string
          full_name: string
          id: string
          is_admin?: boolean
          language?: string
          phone?: string | null
          seller_type?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          language?: string
          phone?: string | null
          seller_type?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_listings: {
        Row: {
          admin_hidden_at: string | null
          admin_hidden_reason: string | null
          buyer_briefing: string | null
          category_id: string | null
          created_at: string
          deliverables: string[]
          delivery_mode: string | null
          delivery_time: string | null
          description: string | null
          freelancer_profile_id: string
          id: string
          price_unit: string | null
          revisions_count: number
          search_vector: unknown
          short_description: string | null
          starting_price_tnd: number | null
          status: string
          subcategory_id: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          buyer_briefing?: string | null
          category_id?: string | null
          created_at?: string
          deliverables?: string[]
          delivery_mode?: string | null
          delivery_time?: string | null
          description?: string | null
          freelancer_profile_id: string
          id?: string
          price_unit?: string | null
          revisions_count?: number
          search_vector?: unknown
          short_description?: string | null
          starting_price_tnd?: number | null
          status?: string
          subcategory_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          buyer_briefing?: string | null
          category_id?: string | null
          created_at?: string
          deliverables?: string[]
          delivery_mode?: string | null
          delivery_time?: string | null
          description?: string | null
          freelancer_profile_id?: string
          id?: string
          price_unit?: string | null
          revisions_count?: number
          search_vector?: unknown
          short_description?: string | null
          starting_price_tnd?: number | null
          status?: string
          subcategory_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_listings_freelancer_profile_id_fkey"
            columns: ["freelancer_profile_id"]
            isOneToOne: false
            referencedRelation: "freelancer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_listings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          shop_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          shop_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_payment_methods: {
        Row: {
          created_at: string
          id: string
          method: string
          note: string | null
          shop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          method: string
          note?: string | null
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_payment_methods_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          admin_hidden_at: string | null
          admin_hidden_reason: string | null
          banner_url: string | null
          city: string | null
          created_at: string
          delivery_setup: string | null
          description: string | null
          id: string
          location_detail: string | null
          logo_url: string | null
          name: string
          owner_id: string
          preferred_carriers: string | null
          shop_type: string | null
          updated_at: string
          working_hours: string | null
        }
        Insert: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          banner_url?: string | null
          city?: string | null
          created_at?: string
          delivery_setup?: string | null
          description?: string | null
          id?: string
          location_detail?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          preferred_carriers?: string | null
          shop_type?: string | null
          updated_at?: string
          working_hours?: string | null
        }
        Update: {
          admin_hidden_at?: string | null
          admin_hidden_reason?: string | null
          banner_url?: string | null
          city?: string | null
          created_at?: string
          delivery_setup?: string | null
          description?: string | null
          id?: string
          location_detail?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          preferred_carriers?: string | null
          shop_type?: string | null
          updated_at?: string
          working_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_objects: {
        Row: {
          backfilled: boolean
          bucket: string
          created_at: string
          id: string
          owner_id: string
          path: string
        }
        Insert: {
          backfilled?: boolean
          bucket: string
          created_at?: string
          id?: string
          owner_id: string
          path: string
        }
        Update: {
          backfilled?: boolean
          bucket?: string
          created_at?: string
          id?: string
          owner_id?: string
          path?: string
        }
        Relationships: []
      }
    }
    Views: {
      buyer_cancellation_history: {
        Row: {
          buyer_id: string | null
          cancellations_by_buyer: number | null
          cancellations_by_buyer_after_pivot: number | null
          cancellations_total: number | null
          last_buyer_cancelled_at: string | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          full_name: string | null
          id: string | null
          language: string | null
          seller_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          full_name?: string | null
          id?: string | null
          language?: string | null
          seller_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          full_name?: string | null
          id?: string | null
          language?: string | null
          seller_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_hide_content: {
        Args: { reason: string; target_id: string; target_type: string }
        Returns: undefined
      }
      admin_overview_stats: {
        Args: never
        Returns: {
          completed_orders: number
          pending_disputes: number
          pending_reports: number
          total_freelancers: number
          total_job_posts: number
          total_products: number
          total_services: number
          total_shops: number
          total_users: number
        }[]
      }
      admin_suspend_user: {
        Args: { reason: string; target_user_id: string }
        Returns: undefined
      }
      admin_unhide_content: {
        Args: { target_id: string; target_type: string }
        Returns: undefined
      }
      admin_unsuspend_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      f_unaccent: { Args: { "": string }; Returns: string }
      freelancer_has_active_listing: {
        Args: { p_freelancer_profile_id: string }
        Returns: boolean
      }
      get_completed_service_order_count: {
        Args: { target: string }
        Returns: number
      }
      get_contact_phone: { Args: { target: string }; Returns: string }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_after_state?: Json
          p_before_state?: Json
          p_note?: string
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      service_listing_publish_problems: {
        Args: { r: Database["public"]["Tables"]["service_listings"]["Row"] }
        Returns: string[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
