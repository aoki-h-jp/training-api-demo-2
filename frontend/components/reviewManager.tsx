'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookReview } from '@/types/types'
import {
  useUsernameStore,
  useBookReviewsStore,
  useCurrentReviewStore,
  useIsAddDialogOpenStore,
  useIsEditDialogOpenStore,
  useIsViewDialogOpenStore,
  useSelectedReviewStore,
} from '@/hooks/hooks'
import { Toaster, toast } from "sonner"
export default function BookReviewManager() {
  const { reviews, setReviews } = useBookReviewsStore()
  const { currentReview, setCurrentReview } = useCurrentReviewStore()
  const { isAddDialogOpen, setIsAddDialogOpen } = useIsAddDialogOpenStore()
  const { isEditDialogOpen, setIsEditDialogOpen } = useIsEditDialogOpenStore()
  const { isViewDialogOpen, setIsViewDialogOpen } = useIsViewDialogOpenStore()
  const { username } = useUsernameStore()
  const { selectedReview, setSelectedReview } = useSelectedReviewStore()

  // POST
  const handleAddReview = async (review: BookReview) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APIGW_URL}/add-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://training-api-demo-2.vercel.app',
          'Access-Control-Request-Method': 'POST',
        },
        body: JSON.stringify(review),
      });

      if (!response.ok) {
        throw new Error('Failed to add review');
      }

      setReviews([...reviews, review]);
      setIsAddDialogOpen(false);
      toast.success("レビューが追加されました", {
        description: "POST API (/add-review)を呼び出してレビューを追加しました。",
      });
    } catch (error) {
      console.error('Error adding review:', error);
      toast.error("レビューの追加に失敗しました", {
        description: "POST API (/add-review)呼び出し中にエラーが発生しました。",
      });
    }
  };

  // PUT
  const handleUpdateReview = async (review: BookReview) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APIGW_URL}/update-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(review),
      });

      if (!response.ok) {
        throw new Error('Failed to update review');
      }

      toast.success("レビューが更新されました", {
        description: "PUT API (/update-review)を呼び出してレビューを更新しました。",
      });
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error("レビューの更新に失敗しました", {
        description: "PUT API (/update-review)呼び出し中にエラーが発生しました。",
      });
    }
  }

  // DELETE
  const handleDeleteReview = async (title: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APIGW_URL}/delete-review?username=${username}&title=${title}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      setReviews(reviews.filter(r => r.title !== title))
      toast.success("レビューが削除されました", {
        description: "DELETE API (/delete-review)を呼び出してレビューを削除しました。",
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error("レビューの削除に失敗しました", {
        description: "DELETE API (/delete-review)呼び出し中にエラーが発生しました。",
      });
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster richColors />
      <Card>
        <CardHeader>
          <CardTitle>書籍レビュー管理</CardTitle>
          <CardDescription>書籍レビューの追加 (POST)、更新 (PUT)、削除 (DELETE) ができます</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー名</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>著者</TableHead>
                <TableHead>レビュー</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review: BookReview) => (
                <TableRow
                  key={review.title}
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSelectedReview(review);
                    setIsViewDialogOpen(true);
                  }}
                >
                  <TableCell>{review.username}</TableCell>
                  <TableCell>{review.title}</TableCell>
                  <TableCell>{review.author}</TableCell>
                  <TableCell>{review.review.substring(0, 50)}...</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="mr-2" onClick={(e) => {
                      e.stopPropagation();
                      setCurrentReview(review);
                      setIsEditDialogOpen(true);
                    }}>
                      編集
                    </Button>
                    <Button variant="destructive" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReview(review.title);
                    }}>
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setIsAddDialogOpen(true)}>新しいレビューを追加</Button>
        </CardFooter>
      </Card>

      <ReviewDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddReview}
        title="新しいレビューを追加"
        updateMode={false}
      />

      <ReviewDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdateReview}
        title="レビューを編集"
        initialData={currentReview}
        updateMode={true}
      />

      <ViewDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        review={selectedReview}
      />
    </div>
  )
}

type ReviewDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (review: BookReview) => void
  title: string
  initialData?: BookReview | null
  updateMode?: boolean
}

function ReviewDialog({ isOpen, onOpenChange, onSubmit, title, initialData, updateMode }: ReviewDialogProps) {
  const { username } = useUsernameStore()
  const [review, setReview] = useState<BookReview>(
    initialData || { username: username, title: '', author: '', review: '' }
  )
  const { reviews, setReviews } = useBookReviewsStore()

  useEffect(() => {
    if (initialData) {
      setReview(initialData)
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(review)
  }

  const handleGenerateReview = async (title: string, author: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APIGW_URL}/generate-review?title=${title}&author=${author}`);
      if (!response.ok) {
        throw new Error('Failed to generate review');
      }
      const data = await response.json();
      toast.success("レビューが生成されました", {
        description: "GET API (/generate-review)を呼び出してレビューを生成しました。",
      });
      setReviews([...reviews, { title, author, review: data.review, username }]);
    } catch (error) {
      console.error('Error generating review:', error);
      toast.error("レビューの生成に失敗しました", {
        description: "GET API (/generate-review)呼び出し中にエラーが発生しました。",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            レビュー情報を入力してください。すべてのフィールドが必須です。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                value={review.username}
                onChange={(e) => setReview({ ...review, username: e.target.value })}
                required
                disabled
              />
            </div>
            <div>
              <Label htmlFor="title">書籍タイトル</Label>
              <Input
                id="title"
                value={updateMode ? initialData?.title : review.title}
                onChange={(e) => setReview({ ...review, title: e.target.value })}
                required
                disabled={updateMode}
              />
            </div>
            <div>
              <Label htmlFor="author">著者</Label>
              <Input
                id="author"
                value={updateMode ? initialData?.author : review.author}
                onChange={(e) => setReview({ ...review, author: e.target.value })}
                required
                disabled={updateMode}
              />
            </div>
            <div>
              <Label htmlFor="review">レビュー</Label>
              <Textarea
                id="review"
                value={review.review}
                onChange={(e) => setReview({ ...review, review: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => handleGenerateReview(review.title, review.author)}>レビュー生成 (GET)</Button>
            <Button type="submit">{updateMode ? "更新 (PUT)" : "新規作成 (POST)"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ViewDialog({ isOpen, onOpenChange, review }: { isOpen: boolean, onOpenChange: (isOpen: boolean) => void, review: BookReview | null }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>レビュー詳細</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>ユーザー名</Label>
            <p>{review?.username}</p>
          </div>
          <div>
            <Label>書籍タイトル</Label>
            <p>{review?.title}</p>
          </div>
          <div>
            <Label>著者</Label>
            <p>{review?.author}</p>
          </div>
          <div>
            <Label>レビュー</Label>
            <p>{review?.review}</p>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}