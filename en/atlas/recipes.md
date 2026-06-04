# Atlas - Recipes

## 1) Paginated list with whitelisted ordering

```ts
const sortable = new Set(['createdAt', 'email', 'status'])
const sortBy = sortable.has(input.sortBy) ? input.sortBy : 'createdAt'

const users = repo.query()
  .where('status', 'active')
  .orderBy(sortBy, 'desc')
  .limit(20)
  .offset((input.page - 1) * 20)
  .exec()
```

## 2) Relation preload + count

```ts
const users = userRepo.query()
  .preload('posts')
  .withCount('posts', (q) => q.as('postsCount'))
  .exec()

const count = users[0]?.getExtra('postsCount')
```

## 3) Soft delete then restore

```ts
await repo.delete(user)   // soft delete if configured
repo.restore(user)
```

## 4) Atomic counter updates

```ts
repo.increment(userId, 'loginCount', 1)
repo.decrement(userId, { credits: 5, balance: 10 })
```

## 5) Dispatch domain events after save

```ts
repo.onDomainEvents = async (events) => {
  for (const ev of events) {
    await bus.emit(ev.name, JSON.stringify(ev.data))
  }
}

order.addDomainEvent('order.paid', { orderId: order.id })
await repo.save(order)
```

## 6) Conditional relation filtering

```ts
const users = userRepo.query()
  .whereHas('posts', (q) => q.where('published', true))
  .exec()
```
