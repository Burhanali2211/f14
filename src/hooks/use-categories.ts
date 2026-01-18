/**
 * Centralized data fetching hooks for categories
 * Optimized queries with specific field selections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_FIELDS } from '@/lib/query-optimizer';
import { toast } from '@/hooks/use-toast';

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    bg_image_url?: string;
    bg_image_opacity?: number;
    bg_image_blur?: number;
    bg_image_position?: string;
    bg_image_size?: string;
    bg_image_scale?: number;
}

export interface CategoryWithStats extends Category {
    piece_count?: number;
}

interface UseCategoriesOptions {
    includeStats?: boolean;
    orderBy?: 'name' | 'created_at';
    ascending?: boolean;
}

/**
 * Fetch all categories with optional stats
 */
export function useCategories(options: UseCategoriesOptions = {}) {
    const { includeStats = false, orderBy = 'name', ascending = true } = options;

    return useQuery({
        queryKey: ['categories', options],
        queryFn: async () => {
            const selectString = includeStats
                ? `${CATEGORY_FIELDS.card}, pieces:pieces(count)`
                : CATEGORY_FIELDS.card;

            const { data, error } = await supabase
                .from('categories')
                .select(selectString)
                .order(orderBy, { ascending });

            if (error) throw error;

            // Transform stats if included
            if (includeStats && data) {
                return data.map((cat: any) => ({
                    ...cat,
                    piece_count: cat.pieces?.[0]?.count || 0,
                    pieces: undefined, // Remove the pieces array
                })) as CategoryWithStats[];
            }

            return data as Category[];
        },
        staleTime: 30 * 60 * 1000, // 30 minutes (categories don't change often)
        gcTime: 60 * 60 * 1000, // 1 hour
    });
}

/**
 * Fetch a single category by slug
 */
export function useCategory(slug: string | undefined) {
    return useQuery({
        queryKey: ['category', slug],
        queryFn: async () => {
            if (!slug) throw new Error('Category slug is required');

            const { data, error } = await supabase
                .from('categories')
                .select(CATEGORY_FIELDS.full)
                .eq('slug', slug)
                .single();

            if (error) throw error;
            return data as Category;
        },
        enabled: !!slug,
        staleTime: 30 * 60 * 1000, // 30 minutes
    });
}

/**
 * Fetch a single category by ID
 */
export function useCategoryById(id: string | undefined) {
    return useQuery({
        queryKey: ['category', 'by-id', id],
        queryFn: async () => {
            if (!id) throw new Error('Category ID is required');

            const { data, error } = await supabase
                .from('categories')
                .select(CATEGORY_FIELDS.full)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Category;
        },
        enabled: !!id,
        staleTime: 30 * 60 * 1000,
    });
}

/**
 * Create a new category
 */
export function useCreateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Partial<Category>) => {
            const { data, error } = await supabase
                .from('categories')
                .insert(category)
                .select(CATEGORY_FIELDS.full)
                .single();

            if (error) throw error;
            return data as Category;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({
                title: 'Success',
                description: 'Category created successfully',
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
 * Update an existing category
 */
export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: string;
            updates: Partial<Category>;
        }) => {
            const { data, error } = await supabase
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select(CATEGORY_FIELDS.full)
                .single();

            if (error) throw error;
            return data as Category;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['category', data.slug] });
            toast({
                title: 'Success',
                description: 'Category updated successfully',
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
 * Delete a category
 */
export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('categories').delete().eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({
                title: 'Success',
                description: 'Category deleted successfully',
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
