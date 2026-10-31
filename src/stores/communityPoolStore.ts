import { create } from 'zustand';
import { supabase } from '../services/supabase/client';

export interface CommunityContributionItem {
  id: string;
  pool_id: string;
  user_id?: string;
  contributor_name: string;
  flat_number: string;
  amount_paid: number;
  created_at: string;
}

export interface CommunityPoolItem {
  id: string;
  pool_code: string;
  society_name: string;
  target_liters: number;
  target_amount: number;
  collected_amount: number;
  delivery_address: string;
  latitude: number;
  longitude: number;
  status: 'collecting' | 'funded' | 'dispatched';
  created_at: string;
  contributions: CommunityContributionItem[];
}

interface CommunityPoolState {
  pools: CommunityPoolItem[];
  isLoading: boolean;
  isContributing: boolean;
  fetchCommunityPools: () => Promise<void>;
  subscribeToLivePools: () => () => void;
  contributeToPool: (
    poolCode: string,
    contributorName: string,
    flatNumber: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  createCommunityPool: (params: {
    societyName: string;
    deliveryAddress: string;
    latitude: number;
    longitude: number;
    targetLiters?: number;
    targetAmount?: number;
  }) => Promise<{ success: boolean; poolCode?: string; error?: string }>;
}

export const useCommunityPoolStore = create<CommunityPoolState>((set, get) => ({
  pools: [],
  isLoading: false,
  isContributing: false,

  fetchCommunityPools: async () => {
    set({ isLoading: true });
    try {
      const { data: poolsData, error: poolError } = await supabase
        .from('community_pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (!poolError && poolsData) {
        const { data: contribsData } = await supabase
          .from('community_pool_contributions')
          .select('*')
          .order('created_at', { ascending: true });

        const mappedPools: CommunityPoolItem[] = poolsData.map((p: any) => {
          const poolContribs = (contribsData || [])
            .filter((c: any) => c.pool_id === p.id)
            .map((c: any) => ({
              id: c.id,
              pool_id: c.pool_id,
              user_id: c.user_id,
              contributor_name: c.contributor_name,
              flat_number: c.flat_number,
              amount_paid: Number(c.amount_paid),
              created_at: c.created_at,
            }));

          return {
            id: p.id,
            pool_code: p.pool_code,
            society_name: p.society_name,
            target_liters: Number(p.target_liters || 20000),
            target_amount: Number(p.target_amount || 2400),
            collected_amount: Number(p.collected_amount || 0),
            delivery_address: p.delivery_address,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            status: p.status,
            created_at: p.created_at,
            contributions: poolContribs,
          };
        });

        set({ pools: mappedPools, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  contributeToPool: async (poolCode, contributorName, flatNumber, amount) => {
    set({ isContributing: true });
    try {
      const { data, error } = await supabase.rpc('contribute_to_community_pool', {
        p_pool_code: poolCode,
        p_contributor_name: contributorName,
        p_flat_number: flatNumber,
        p_amount: amount,
      });

      if (error) {
        set({ isContributing: false });
        return { success: false, error: error.message };
      }

      await get().fetchCommunityPools();
      set({ isContributing: false });
      return { success: true };
    } catch (err: any) {
      set({ isContributing: false });
      return { success: false, error: err?.message || 'Contribution failed' };
    }
  },

  createCommunityPool: async (params) => {
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const poolCode = `POOL-MUM-${randomSuffix}`;

      const { error } = await supabase.from('community_pools').insert({
        pool_code: poolCode,
        society_name: params.societyName,
        delivery_address: params.deliveryAddress,
        latitude: params.latitude,
        longitude: params.longitude,
        target_liters: params.targetLiters || 20000,
        target_amount: params.targetAmount || 2400.0,
        status: 'collecting',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await get().fetchCommunityPools();
      return { success: true, poolCode };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create community pool' };
    }
  },

  subscribeToLivePools: () => {
    const channel = supabase
      .channel('public:community_pools:live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_pools' },
        () => {
          get().fetchCommunityPools();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_pool_contributions' },
        () => {
          get().fetchCommunityPools();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
}));

