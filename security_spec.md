# Security Specification & Threat Model - SakuPintar

This document defines the security specification, threat model, and validation plan for the SakuPintar Firestore Security Rules.

## 1. Data Invariants
1. **User Ownership**: All user profiles (`/users/{userId}`) and transactions (`/users/{userId}/transactions/{transactionId}`) are strictly isolated. No user can read, list, create, update, or delete another user's data.
2. **Profile Shape**: User profile documents must contain exactly: `uid`, `email`, `createdAt`, and `monthlyBudget`.
3. **Transaction Shape**: Transaction documents must contain exactly: `type`, `amount`, `category`, `subcategory`, `date`, `description`, and `createdAt`.
4. **Value Safety**:
   - `amount` must be a number.
   - `monthlyBudget` must be a number.
   - `type` must be either `pemasukan` or `pengeluaran`.
5. **Immutability**:
   - User `uid`, `email`, and `createdAt` are immutable after creation.
   - Transaction `createdAt` is immutable after creation.
6. **Path Integrity**: Path variables `{userId}` and `{transactionId}` must be valid alphanumeric IDs with no directory traversal or resource exhaustion payloads.

---

## 2. The "Dirty Dozen" Threat Payloads
These payloads attempt to bypass SakuPintar's security model and must always be rejected by the security rules with `PERMISSION_DENIED`.

### Pillar 1: Identity & Authentication Attacks
1. **Unauthenticated Read**: An unauthenticated client attempts to read `/users/user_abc`.
2. **Unauthenticated Write**: An unauthenticated client attempts to create a transaction under `/users/user_abc/transactions/tx_123`.
3. **Identity Spoofing (Foreign Profile Create)**: Authenticated user `user_1` attempts to create a user profile document at `/users/user_2`.
4. **Identity Spoofing (Foreign Transaction Write)**: Authenticated user `user_1` attempts to add a transaction to `/users/user_2/transactions/tx_123`.

### Pillar 2: Schema & Type Poisoning Attacks
5. **Ghost Field Injection (Shadow Update)**: User `user_1` attempts to update their user profile at `/users/user_1` with a ghost field `isAdmin: true` to escalate privileges.
6. **Type Mismatch Attack**: User `user_1` attempts to update `monthlyBudget` to a string value `"ten million"` instead of a number.
7. **Invalid Enum Attack**: User `user_1` attempts to save a transaction with type `"transfer"` instead of `"pemasukan"` or `"pengeluaran"`.
8. **Negative Value / Overflow Attack**: User attempts to save a massive or malformed value.

### Pillar 3: Immutability & Lifecycle Hacks
9. **Creation Timestamp Spoofing (Update)**: User attempts to update `createdAt` of an existing transaction at `/users/user_1/transactions/tx_123` to bypass historical logs tracking.
10. **UID Mutability Attack**: User attempts to update the `uid` property in `/users/user_1` to a different user's UID.

### Pillar 4: Resource Exhaustion & Path Injection
11. **ID Poisoning Attack**: User attempts to create a transaction with a 1.5KB long transaction ID containing special characters (`../invalid_id!!!`) to crash query indexers.
12. **Blanket Query Scraping**: User attempts to list all transactions across the entire app database (`collectionGroup` query or unrestricted list) without limiting the collection path to their own `userId`.

---

## 3. Test Assertions
All of the above payloads must return a strict `PERMISSION_DENIED` response, ensuring the application remains robust and isolated.
