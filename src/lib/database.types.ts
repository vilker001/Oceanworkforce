export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string
                    role: string
                    avatar: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    name: string
                    role: string
                    avatar?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    role?: string
                    avatar?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            tasks: {
                Row: {
                    id: string
                    title: string
                    project: string
                    status: string
                    priority: string
                    responsible_id: string | null
                    start_date: string
                    due_date: string
                    objectives: Json
                    completion_report: string | null
                    manager_feedback: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    project: string
                    status?: string
                    priority?: string
                    responsible_id?: string | null
                    start_date: string
                    due_date: string
                    objectives?: Json
                    completion_report?: string | null
                    manager_feedback?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    project?: string
                    status?: string
                    priority?: string
                    responsible_id?: string | null
                    start_date?: string
                    due_date?: string
                    objectives?: Json
                    completion_report?: string | null
                    manager_feedback?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            clients: {
                Row: {
                    id: string
                    name: string
                    email: string
                    phone: string | null
                    company_phone: string | null
                    internal_contact: string | null
                    internal_contact_phone: string | null
                    internal_contact_role: string | null
                    client_responsible_name: string | null
                    client_responsible_phone: string | null
                    status: string
                    responsible_id: string | null
                    services: string[]
                    location: string | null
                    provenance: string | null
                    last_activity: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    phone?: string | null
                    company_phone?: string | null
                    internal_contact?: string | null
                    internal_contact_phone?: string | null
                    internal_contact_role?: string | null
                    client_responsible_name?: string | null
                    client_responsible_phone?: string | null
                    status?: string
                    responsible_id?: string | null
                    services?: string[]
                    location?: string | null
                    provenance?: string | null
                    last_activity?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    phone?: string | null
                    company_phone?: string | null
                    internal_contact?: string | null
                    internal_contact_phone?: string | null
                    internal_contact_role?: string | null
                    client_responsible_name?: string | null
                    client_responsible_phone?: string | null
                    status?: string
                    responsible_id?: string | null
                    services?: string[]
                    location?: string | null
                    provenance?: string | null
                    last_activity?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            calendar_events: {
                Row: {
                    id: string
                    title: string
                    date: string
                    type: string
                    description: string | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    date: string
                    type: string
                    description?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    date?: string
                    type?: string
                    description?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            transactions: {
                Row: {
                    id: string
                    description: string
                    date: string
                    category: string
                    value: number
                    type: string
                    status: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    description: string
                    date: string
                    category: string
                    value: number
                    type: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    description?: string
                    date?: string
                    category?: string
                    value?: number
                    type?: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    task_id: string | null
                    type: 'task_assigned' | 'deadline_24h' | 'deadline_today' | 'task_overdue'
                    title: string
                    description: string | null
                    is_read: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    task_id?: string | null
                    type: 'task_assigned' | 'deadline_24h' | 'deadline_today' | 'task_overdue'
                    title: string
                    description?: string | null
                    is_read?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    task_id?: string | null
                    type?: 'task_assigned' | 'deadline_24h' | 'deadline_today' | 'task_overdue'
                    title?: string
                    description?: string | null
                    is_read?: boolean
                    created_at?: string
                }
            }
        }
        Views: {
            tasks_with_users: {
                Row: {
                    id: string
                    title: string
                    project: string
                    status: string
                    priority: string
                    responsible_id: string | null
                    start_date: string
                    due_date: string
                    objectives: Json
                    completion_report: string | null
                    manager_feedback: string | null
                    created_at: string
                    updated_at: string
                    responsible_name: string | null
                    responsible_avatar: string | null
                    responsible_role: string | null
                }
            }
            clients_with_users: {
                Row: {
                    id: string
                    name: string
                    email: string
                    phone: string | null
                    company_phone: string | null
                    internal_contact: string | null
                    internal_contact_phone: string | null
                    internal_contact_role: string | null
                    client_responsible_name: string | null
                    client_responsible_phone: string | null
                    status: string
                    responsible_id: string | null
                    services: string[]
                    location: string | null
                    provenance: string | null
                    last_activity: string | null
                    created_at: string
                    updated_at: string
                    responsible_name: string | null
                    responsible_avatar: string | null
                }
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
