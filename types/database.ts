export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericRow = Record<string, unknown>;

type TableDefinition<
  Row extends GenericRow,
  Insert extends GenericRow = Partial<Row>,
  Update extends GenericRow = Partial<Row>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<{
        id: string;
        full_name: string | null;
        email: string | null;
        role: string;
        created_at: string;
        updated_at: string;
      }>;
      vendors: TableDefinition<{
        id: string;
        vendor_code: string;
        whatsapp_number: string;
        first_name: string | null;
        last_name: string | null;
        business_name: string | null;
        primary_category_id: string | null;
        country: string;
        province: string | null;
        city: string | null;
        area: string | null;
        market_name: string | null;
        preferred_language: string;
        profile_image_url: string | null;
        status: string;
        verification_status: string;
        created_at: string;
        updated_at: string;
      }>;
      customers: TableDefinition<{
        id: string;
        whatsapp_number: string;
        display_name: string | null;
        country: string;
        city: string | null;
        area: string | null;
        preferred_language: string;
        verification_status: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>;
      customer_addresses: TableDefinition<{
        id: string;
        customer_id: string;
        label: string;
        line1: string;
        line2: string | null;
        area: string | null;
        city: string | null;
        province: string | null;
        country: string;
        is_default: boolean;
        created_at: string;
        updated_at: string;
      }>;
      referral_codes: TableDefinition<{
        id: string;
        code: string;
        owner_type: string;
        owner_id: string;
        created_at: string;
      }>;
      referrals: TableDefinition<{
        id: string;
        code_id: string;
        referrer_type: string;
        referrer_id: string;
        referee_phone: string;
        referee_type: string | null;
        referee_id: string | null;
        status: string;
        qualified_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      categories: TableDefinition<{
        id: string;
        name: string;
        slug: string;
        parent_id: string | null;
        status: string;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>;
      products: TableDefinition<{
        id: string;
        vendor_id: string;
        category_id: string | null;
        name: string;
        description: string | null;
        price: string;
        currency: string;
        quantity: string;
        unit: string;
        image_url: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>;
      orders: TableDefinition<{
        id: string;
        order_number: string;
        customer_id: string;
        vendor_id: string;
        status: string;
        subtotal: string;
        delivery_fee: string;
        total: string;
        currency: string;
        fulfilment_method: string;
        payment_method: string | null;
        payment_status: string;
        created_at: string;
        updated_at: string;
        accepted_at: string | null;
        ready_at: string | null;
        completed_at: string | null;
        cancelled_at: string | null;
      }>;
      order_items: TableDefinition<{
        id: string;
        order_id: string;
        product_id: string | null;
        product_name_snapshot: string;
        quantity: string;
        unit: string;
        unit_price: string;
        total: string;
        created_at: string;
      }>;
      conversation_sessions: TableDefinition<{
        id: string;
        phone_number: string;
        user_type: string;
        user_id: string | null;
        current_state: string;
        context_json: Json;
        is_active: boolean;
        last_message_at: string;
        expires_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      message_logs: TableDefinition<{
        id: string;
        external_message_id: string | null;
        phone_number: string;
        direction: string;
        message_type: string;
        message_text: string | null;
        payload: Json;
        status: string;
        created_at: string;
      }>;
      support_tickets: TableDefinition<{
        id: string;
        user_type: string | null;
        user_id: string | null;
        phone_number: string | null;
        category: string;
        priority: string;
        status: string;
        description: string;
        assigned_to: string | null;
        created_at: string;
        updated_at: string;
        resolved_at: string | null;
      }>;
      analytics_events: TableDefinition<{
        id: string;
        event_name: string;
        user_type: string | null;
        user_id: string | null;
        metadata: Json;
        created_at: string;
      }>;
      audit_logs: TableDefinition<{
        id: string;
        admin_user_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        old_value: Json | null;
        new_value: Json | null;
        created_at: string;
      }>;
      idempotency_keys: TableDefinition<{
        id: string;
        key: string;
        operation: string;
        entity_type: string;
        entity_id: string | null;
        created_at: string;
      }>;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_vendor_code: {
        Args: { p_city?: string | null };
        Returns: string;
      };
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      complete_order_and_decrement_stock: {
        Args: { p_order_id: string };
        Returns: {
          id: string;
          order_number: string;
          customer_id: string;
          vendor_id: string;
          status: string;
          subtotal: string;
          delivery_fee: string;
          total: string;
          currency: string;
          fulfilment_method: string;
          payment_method: string | null;
          payment_status: string;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          ready_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerAddress = Database["public"]["Tables"]["customer_addresses"]["Row"];
export type ReferralCode = Database["public"]["Tables"]["referral_codes"]["Row"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type ConversationSession =
  Database["public"]["Tables"]["conversation_sessions"]["Row"];
export type MessageLog = Database["public"]["Tables"]["message_logs"]["Row"];
export type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
export type AnalyticsEvent =
  Database["public"]["Tables"]["analytics_events"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
