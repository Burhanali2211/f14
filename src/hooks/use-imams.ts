/**
 * Centralized data fetching hooks for imams (holy figures)
 * Optimized queries with specific field selections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IMAM_FIELDS } from '@/lib/query-optimizer';
import { toast } from '@/hooks/use-toast';

export interface Imam {
    id: string;
    name: string;
    slug: string;
    title?: string;
    description?: string;
    order_index: number;
    image_url?: string;
    category?: 'imam' | 'prophet' | 'sahabi' | 'other';
}

export interface ImamWithStats extends Imam {
    piece_count?: number;
}

interface UseImamsOptions {
    includeStats?: boolean;
    category?: string;
    orderBy?: 'order_index' | 'name';
}

/**
 * Fetch all imams with optional stats
 */
export function useImams(options: UseImamsOptions = {}) {
    const { includeStats = false, category, orderBy = 'order_index' } = options;

    return useQuery({
        queryKey: ['imams', options],
        queryFn: async () => {
            const selectString = includeStats
                ? `${IMAM_FIELDS.card}, pieces:pieces(count)`
                : IMAM_FIELDS.card;

            let query = supabase.from('imams').select(selectString);

            // Filter by category if provided
            if (category) {
                query = query.eq('category', category);
            }

            // Order by specified field
            if (orderBy === 'order_index') {
                query = query.order('order_index', { ascending: true });
                query = query.order('name', { ascending: true }); // Secondary sort
            } else {
                query = query.order('name', { ascending: true });
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform stats if included
            if (includeStats && data) {
                return data.map((imam: any) => ({
                    ...imam,
                    piece_count: imam.pieces?.[0]?.count || 0,
                    pieces: undefined,
                })) as ImamWithStats[];
            }

            return data as Imam[];
        },
        staleTime: 60 * 60 * 1000, // 1 hour (imams rarely change)
        gcTime: 2 * 60 * 60 * 1000, // 2 hours
    });
}

/**
 * Fetch a single imam by slug
 */
export function useImam(slug: string | undefined) {
    return useQuery({
        queryKey: ['imam', slug],
        queryFn: async () => {
            if (!slug) throw new Error('Imam slug is required');

            const { data, error } = await supabase
                .from('imams')
                .select(IMAM_FIELDS.full)
                .eq('slug', slug)
                .single();

            if (error) throw error;
            return data as Imam;
        },
        enabled: !!slug,
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

/**
 * Fetch a single imam by ID
 */
export function useImamById(id: string | undefined) {
    return useQuery({
        queryKey: ['imam', 'by-id', id],
        queryFn: async () => {
            if (!id) throw new Error('Imam ID is required');

            const { data, error } = await supabase
                .from('imams')
                .select(IMAM_FIELDS.full)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Imam;
        },
        enabled: !!id,
        staleTime: 60 * 60 * 1000,
    });
}

/**
 * Create a new imam
 */
export function useCreateImam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (imam: Partial<Imam>) => {
            const { data, error } = await supabase
                .from('imams')
                .insert(imam)
                .select(IMAM_FIELDS.full)
                .single();

            if (error) throw error;
            return data as Imam;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['imams'] });
            toast({
                title: 'Success',
                description: 'Imam created successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Update an existing imam
 */
export function useUpdateImam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: string;
            updates: Partial<Imam>;
        }) => {
            const { data, error } = await supabase
                .from('imams')
                .update(updates)
                .eq('id', id)
                .select(IMAM_FIELDS.full)
                .single();

            if (error) throw error;
            return data as Imam;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['imams'] });
            queryClient.invalidateQueries({ queryKey: ['imam', data.slug] });
            toast({
                title: 'Success',
                description: 'Imam updated successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Delete an imam
 */
export function useDeleteImam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('imams').delete().eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['imams'] });
            toast({
                title: 'Success',
                description: 'Imam deleted successfully',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}
