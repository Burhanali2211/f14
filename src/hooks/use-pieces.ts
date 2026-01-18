/**
 * Centralized data fetching hooks for pieces
 * Replaces scattered queries with optimized, consistent implementations
 * Uses specific field selections instead of SELECT *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PIECE_FIELDS } from '@/lib/query-optimizer';
import { toast } from '@/hooks/use-toast';

export interface Piece {
    id: string;
    title: string;
    text_content?: string;
    image_url?: string;
    video_url?: string;
    reciter?: string;
    language: string;
    view_count: number;
    created_at: string;
    updated_at?: string;
    category_id: string;
    imam_id?: string;
    tags?: string[];
    user_id?: string;
}

export interface PieceWithRelations extends Piece {
    category?: {
        id: string;
        name: string;
        slug: string;
        icon?: string;
    };
    imam?: {
        id: string;
        name: string;
        slug: string;
        title?: string;
    };
}

interface UsePiecesOptions {
    categoryId?: string;
    imamId?: string;
    reciter?: string;
    userId?: string;
    language?: string;
    limit?: number;
    includeRelations?: boolean;
    orderBy?: 'created_at' | 'view_count' | 'title';
    ascending?: boolean;
}

/**
 * Fetch pieces with optimized queries
 */
export function usePieces(options: UsePiecesOptions = {}) {
    const {
        categoryId,
        imamId,
        reciter,
        userId,
        language,
        limit = 50,
        includeRelations = false,
        orderBy = 'created_at',
        ascending = false,
    } = options;

    return useQuery({
        queryKey: ['pieces', options],
        queryFn: async () => {
            // Build select string based on includeRelations
            const selectString = includeRelations
                ? `
          ${PIECE_FIELDS.card},
          category:categories(id, name, slug, icon),
          imam:imams(id, name, slug, title)
        `
                : PIECE_FIELDS.card;

            let query = supabase.from('pieces').select(selectString);

            // Apply filters
            if (categoryId) query = query.eq('category_id', categoryId);
            if (imamId) query = query.eq('imam_id', imamId);
            if (reciter) query = query.eq('reciter', reciter);
            if (userId) query = query.eq('user_id', userId);
            if (language) query = query.eq('language', language);

            // Apply ordering
            query = query.order(orderBy, { ascending });

            // Apply limit
            query = query.limit(limit);

            const { data, error } = await query;

            if (error) throw error;
            return data as PieceWithRelations[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
}

/**
 * Fetch a single piece by ID with full details
 */
export function usePiece(id: string | undefined) {
    return useQuery({
        queryKey: ['piece', id],
        queryFn: async () => {
            if (!id) throw new Error('Piece ID is required');

            const { data, error } = await supabase
                .from('pieces')
                .select(
                    `
          ${PIECE_FIELDS.full},
          category:categories(id, name, slug, icon),
          imam:imams(id, name, slug, title)
        `
                )
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as PieceWithRelations;
        },
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Fetch pieces for search with optimized fields
 */
export function useSearchPieces(searchTerm: string) {
    return useQuery({
        queryKey: ['pieces', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm || searchTerm.length < 2) return [];

            const { data, error } = await supabase
                .from('pieces')
                .select(PIECE_FIELDS.search)
                .or(
                    `title.ilike.%${searchTerm}%,reciter.ilike.%${searchTerm}%,text_content.ilike.%${searchTerm}%`
                )
                .limit(20);

            if (error) throw error;
            return data as Piece[];
        },
        enabled: searchTerm.length >= 2,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Fetch popular pieces (by view count)
 */
export function usePopularPieces(limit: number = 10) {
    return useQuery({
        queryKey: ['pieces', 'popular', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pieces')
                .select(
                    `
          ${PIECE_FIELDS.card},
          category:categories(id, name, slug, icon)
        `
                )
                .order('view_count', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data as PieceWithRelations[];
        },
        staleTime: 15 * 60 * 1000, // 15 minutes
    });
}

/**
 * Fetch recent pieces
 */
export function useRecentPieces(limit: number = 10) {
    return useQuery({
        queryKey: ['pieces', 'recent', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pieces')
                .select(
                    `
          ${PIECE_FIELDS.card},
          category:categories(id, name, slug, icon)
        `
                )
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data as PieceWithRelations[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Increment piece view count
 */
export function useIncrementViewCount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (pieceId: string) => {
            const { error } = await supabase.rpc('increment_view_count', {
                piece_id: pieceId,
            });

            if (error) throw error;
        },
        onSuccess: (_, pieceId) => {
            // Invalidate piece query to refetch updated view count
            queryClient.invalidateQueries({ queryKey: ['piece', pieceId] });
            queryClient.invalidateQueries({ queryKey: ['pieces', 'popular'] });
        },
    });
}

/**
 * Create a new piece
 */
export function useCreatePiece() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (piece: Partial<Piece>) => {
            const { data, error } = await supabase
                .from('pieces')
                .insert(piece)
                .select(PIECE_FIELDS.full)
                .single();

            if (error) throw error;
            return data as Piece;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pieces'] });
            toast({
                title: 'Success',
                description: 'Piece created successfully',
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
 * Update an existing piece
 */
export function useUpdatePiece() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates,
        }: {
            id: string;
            updates: Partial<Piece>;
        }) => {
            const { data, error } = await supabase
                .from('pieces')
                .update(updates)
                .eq('id', id)
                .select(PIECE_FIELDS.full)
                .single();

            if (error) throw error;
            return data as Piece;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['pieces'] });
            queryClient.invalidateQueries({ queryKey: ['piece', data.id] });
            toast({
                title: 'Success',
                description: 'Piece updated successfully',
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
 * Delete a piece
 */
export function useDeletePiece() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('pieces').delete().eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pieces'] });
            toast({
                title: 'Success',
                description: 'Piece deleted successfully',
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
 * Get piece count by category
 */
export function usePieceCountByCategory() {
    return useQuery({
        queryKey: ['pieces', 'count-by-category'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pieces')
                .select('category_id')
                .select('category_id, count');

            if (error) throw error;

            // Group by category_id
            const counts: Record<string, number> = {};
            data.forEach((item: any) => {
                counts[item.category_id] = (counts[item.category_id] || 0) + 1;
            });

            return counts;
        },
        staleTime: 15 * 60 * 1000, // 15 minutes
    });
}
