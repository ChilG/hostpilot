import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/AppStore'

describe('notificationsSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      notifications: [],
    })
  })

  it('should add a notification', () => {
    useAppStore.getState().addNotification('Title 1', 'Description 1', 'info')

    const updated = useAppStore.getState()
    expect(updated.notifications.length).toBe(1)
    expect(updated.notifications[0].title).toBe('Title 1')
    expect(updated.notifications[0].unread).toBe(true)
    expect(updated.notifications[0].type).toBe('info')
  })

  it('should keep max 50 notifications and prune oldest', () => {
    const store = useAppStore.getState()
    
    // Add 52 notifications
    for (let i = 1; i <= 52; i++) {
      store.addNotification(`Notif ${i}`, `Desc ${i}`)
    }

    const updated = useAppStore.getState()
    expect(updated.notifications.length).toBe(50)
    // The first element in list is newest (Notif 52)
    expect(updated.notifications[0].title).toBe('Notif 52')
    // The last element is Notif 3 (since Notif 1 and 2 are pruned)
    expect(updated.notifications[49].title).toBe('Notif 3')
  })

  it('should mark all notifications as read', () => {
    useAppStore.setState({
      notifications: [
        { id: 'n1', title: 'T1', description: 'D1', type: 'info', timestamp: '', unread: true },
        { id: 'n2', title: 'T2', description: 'D2', type: 'success', timestamp: '', unread: true },
      ],
    })

    useAppStore.getState().markAllNotificationsAsRead()

    const updated = useAppStore.getState()
    expect(updated.notifications[0].unread).toBe(false)
    expect(updated.notifications[1].unread).toBe(false)
  })

  it('should clear all notifications', () => {
    useAppStore.setState({
      notifications: [
        { id: 'n1', title: 'T1', description: 'D1', type: 'info', timestamp: '', unread: true },
      ],
    })

    useAppStore.getState().clearNotifications()

    const updated = useAppStore.getState()
    expect(updated.notifications.length).toBe(0)
  })
})
