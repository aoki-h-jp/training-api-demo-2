'use client'

import { useEffect } from 'react'
import UsernameDialog from '@/components/usernameDialog'
import { useUsernameDialogStore } from '@/hooks/hooks'
import ReviewManager from '@/components/reviewManager'

export default function UsernameModal() {
  const { isOpen, setIsOpen } = useUsernameDialogStore()

  // 必ずロード後にユーザー名ダイアログを開く
  useEffect(() => {
    setIsOpen(true)
  }, [])

  return (
    <>
      <title>training-api-demo</title>
      {isOpen ? <UsernameDialog /> : null}
      {!isOpen ? <ReviewManager /> : null}
    </>
  )
}