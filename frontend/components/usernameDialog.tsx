import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUsernameDialogStore, useUsernameStore, useBookReviewsStore } from "@/hooks/hooks"

export default function UsernameDialog() {
  const { isOpen, setIsOpen } = useUsernameDialogStore()
  const { username, setUsername } = useUsernameStore()
  const { setReviews } = useBookReviewsStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      // ここでユーザー名を保存したり、他の処理を行ったりします
      console.log('Username submitted:', username)
      const fetchData = async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APIGW_URL}/get-reviews?username=${username}`)
        if (!response.ok) {
          console.error("Failed to fetch reviews", response);
          throw new Error('Failed to fetch reviews');
        }
        const data = await response.json()
        console.log("data", data);
        setReviews(data)
      }
      fetchData()
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ユーザー名を入力してください</DialogTitle>
          <DialogDescription>
            続行するにはユーザー名を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ユーザー名を入力"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            送信
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
