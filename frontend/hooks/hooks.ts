import { create } from 'zustand'
import {
  UsernameDialogState,
  UsernameState,
  BookReview,
  BookReviewsState,
  CurrentReviewState,
  IsAddDialogOpenState,
  IsEditDialogOpenState,
  IsViewDialogOpenState,
  SelectedReviewState,
} from '@/types/types'

export const useUsernameDialogStore = create<UsernameDialogState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
}))

export const useUsernameStore = create<UsernameState>((set) => ({
  username: '',
  setUsername: (username: string) => set({ username }),
}))

export const useBookReviewsStore = create<BookReviewsState>((set) => ({
  reviews: [],
  setReviews: (reviews: BookReview[]) => set({ reviews }),
}))

export const useCurrentReviewStore = create<CurrentReviewState>((set) => ({
  currentReview: null,
  setCurrentReview: (currentReview: BookReview | null) => set({ currentReview })
}))

export const useIsAddDialogOpenStore = create<IsAddDialogOpenState>((set) => ({
  isAddDialogOpen: false,
  setIsAddDialogOpen: (isAddDialogOpen: boolean) => set({ isAddDialogOpen }),
}))

export const useIsEditDialogOpenStore = create<IsEditDialogOpenState>((set) => ({
  isEditDialogOpen: false,
  setIsEditDialogOpen: (isEditDialogOpen: boolean) => set({ isEditDialogOpen }),
}))

export const useIsViewDialogOpenStore = create<IsViewDialogOpenState>((set) => ({
  isViewDialogOpen: false,
  setIsViewDialogOpen: (isViewDialogOpen: boolean) => set({ isViewDialogOpen }),
}))

export const useSelectedReviewStore = create<SelectedReviewState>((set) => ({
  selectedReview: null,
  setSelectedReview: (selectedReview: BookReview | null) => set({ selectedReview }),
}))
