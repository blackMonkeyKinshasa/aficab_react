# Guide Expo Client — Modèles de facture (proforma / facture)

Cible : `C:\Users\hp\Documents\projet_expo\Aficab`  
Réf. web : `GET /api/booking/{id}/invoice` + PDF portail (`app/b2b/invoice-pdf.ts`)

---

## 1. Principe — l’app ne « choisit » pas le modèle

Il n’y a **pas** de paramètre `?type=proforma` à envoyer.

Le **serveur** décide le modèle à partir de l’état de la réservation.  
L’app mobile :

1. appelle `GET /booking/{id}/invoice`
2. lit `proforma` + `id` (`PRO-…` ou `FAC-…`)
3. affiche le bon libellé / télécharge le PDF correspondant

| Modèle | `proforma` | Préfixe `id` | Quand |
|--------|------------|--------------|--------|
| **Proforma** | `true` | `PRO-{bookingId}` | Non payé **et** status ∉ {ENDED, ARCHIVED} |
| **Facture** | `false` | `FAC-{bookingId}` | `isPaid === true` **ou** status ∈ {ENDED, ARCHIVED} |
| **Aucun** | — | — | `status === CANCELED` → HTTP **409** |

```
CANCELED? ──oui──► 409 INVOICE_NOT_AVAILABLE
    │ non
    ▼
isPaid || ENDED || ARCHIVED ? ──oui──► FACTURE (FAC-*, proforma:false)
    │ non
    ▼
PROFORMA (PRO-*, proforma:true)
```

Cas fréquent mobile :
- réservation créée, pas encore payée → **proforma**
- paiement OK (`isPaid`) → **facture**
- course terminée sans cash immédiatement (ENDED) → **facture** aussi
- facturation différée Premium / B2B : flag `deferredBilling: true` (toujours le même endpoint ; modèle selon règle ci-dessus)

---

## 2. API JSON (disponible aujourd’hui)

```http
GET /api/booking/{id}/invoice
Authorization: Bearer <supabase_access_token>
```

### Réponse 200 (exemple proforma)

```json
{
  "id": "PRO-clx…",
  "bookingId": "clx…",
  "proforma": true,
  "issuedAt": "2026-10-26T10:00:00.000Z",
  "dueAt": "2026-11-25T10:00:00.000Z",
  "paidAt": null,
  "currency": "USD",
  "total": 465,
  "isPaid": false,
  "status": "PENDING",
  "deferredBilling": false,
  "client": { "id": "…", "full_name": "…", "email": "…", "phone": "…" },
  "vehicle": "Toyota Land Cruiser",
  "service": "Location",
  "departureAt": "…",
  "arrivalAt": "…"
}
```

### Réponse 200 (exemple facture)

```json
{
  "id": "FAC-clx…",
  "bookingId": "clx…",
  "proforma": false,
  "paidAt": "2026-10-26T12:00:00.000Z",
  "isPaid": true,
  "status": "CONFIRMED",
  "total": 465
}
```

### Erreurs

| Status | Code | Action UI |
|--------|------|-----------|
| 403 | FORBIDDEN | Pas le propriétaire |
| 404 | BOOKING_NOT_FOUND | Masquer CTA |
| 409 | INVOICE_NOT_AVAILABLE | Résa annulée — « Aucun document » |

### Helper Expo (`api/booking.ts`)

```ts
export type BookingInvoice = {
  id: string;           // "PRO-…" | "FAC-…"
  bookingId: string;
  proforma: boolean;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  currency: string;
  total: number | null;
  isPaid: boolean;
  status: string;
  deferredBilling: boolean;
  client: { id: string; full_name?: string | null; email?: string | null; phone?: string | null } | null;
  vehicle: string | null;
  service: string;
  departureAt: string | null;
  arrivalAt: string | null;
};

export function getBookingInvoice(bookingId: string) {
  return apiAuthFetch<BookingInvoice>(`/booking/${bookingId}/invoice`, {
    method: 'GET',
  });
}
```

---

## 3. Décision UI sans appeler l’API (liste / badge)

Sur la liste des réservations (`GET /booking?clientId=`), tu as déjà `isPaid` + `status`.  
Même règle que le serveur :

```ts
export type InvoiceDocKind = 'none' | 'proforma' | 'invoice';

export function resolveInvoiceKind(booking: {
  status: string;
  isPaid: boolean;
}): InvoiceDocKind {
  if (booking.status === 'CANCELED') return 'none';
  if (
    booking.isPaid ||
    booking.status === 'ENDED' ||
    booking.status === 'ARCHIVED'
  ) {
    return 'invoice';
  }
  return 'proforma';
}

export function invoiceDisplayId(bookingId: string, kind: InvoiceDocKind) {
  if (kind === 'none') return null;
  return `${kind === 'invoice' ? 'FAC' : 'PRO'}-${bookingId}`;
}
```

Libellés i18n recommandés :

| kind | Bouton | Badge |
|------|--------|-------|
| `proforma` | « Télécharger le proforma » | « Proforma · À régler » |
| `invoice` | « Télécharger la facture » | « Payée » / « Facture » |
| `none` | — | « Annulée » / « Aucun document » |

Toujours **revalider** avec `GET …/invoice` avant téléchargement (état peut avoir changé après paiement).

---

## 4. Générer / afficher le document

### 4.1 Ce que fait le web aujourd’hui

1. `GET` booking + map → objet facture interne (`proforma` flag)
2. PDF **dans le navigateur** (`pdf-lib`) — **pas utilisable tel quel dans Expo**

Différences PDF proforma vs facture :

| Zone PDF | Proforma | Facture |
|----------|----------|---------|
| Titre | `PROFORMA` | `FACTURE` |
| N° | `PRO-{id}` | `FAC-{id}` |
| Date | « Date du proforma » | « Date de la facture » |
| Statut | `PROFORMA · NON PAYÉ` | `PAIEMENT CONFIRMÉ` / en attente / retard |
| Total | `TOTAL PROFORMA` | `TOTAL À RÉGLER` / `TOTAL PAYÉ` |
| Pied | Mentions « non contractuel · paiement non reçu » | Conditions 30 jours |

### 4.2 Ce que doit faire Expo (recommandé)

**Ne pas** recoder un PDF local avec deux templates divergents.

Quand disponible :

```http
GET /api/booking/{id}/invoice.pdf
Authorization: Bearer …
→ application/pdf
Content-Disposition: attachment; filename="PRO-….pdf" | "FAC-….pdf"
```

Même auth / mêmes règles que le JSON. Le serveur choisit le layout proforma vs facture.

```ts
// Préparé pour quand la route existera
export async function getBookingInvoicePdf(bookingId: string): Promise<ArrayBuffer> {
  const token = await getRequiredAccessToken();
  const base = /* API_URL */;
  const res = await fetch(`${base}/booking/${bookingId}/invoice.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(/* … */);
  return res.arrayBuffer();
}

// Puis FileSystem.writeAsStringAsync (base64) + Sharing.shareAsync
```

**État actuel backend :** JSON ✅ — route `.pdf` ⏳ (prévue ; voir `MOBILE-CLIENT-DIFFS-PREP` §2.3).

### 4.3 Contournement temporaire (déconseillé long terme)

1. `GET …/invoice` + `GET /booking/:id` (options, car, coupon)
2. Rendre un écran « aperçu document » React Native (pas un vrai PDF comptable)
3. Ou WebView vers une page web authentifiée

→ Duplique les mentions légales / layout. Préférer attendre `invoice.pdf`.

---

## 5. Flux UX recommandé

### Détail réservation (`BookingDetailModal`)

```
si kind === 'none'     → pas de bouton document
si kind === 'proforma' → bouton orange « Télécharger le proforma »
si kind === 'invoice'  → bouton « Télécharger la facture »
```

Au tap :

```ts
async function onDownloadInvoice(bookingId: string) {
  const meta = await getBookingInvoice(bookingId); // valide + label exact
  // const pdf = await getBookingInvoicePdf(bookingId); // quand dispo
  // share file named `${meta.id}.pdf`
  // interim: afficher sheet récap avec meta.proforma ? titres PROFORMA : FACTURE
}
```

### Écran Facturation (parité portail)

Liste des résas non annulées :

- ligne : `{PRO|FAC}-{8 premiers chars}` · date · lieu · montant · badge
- CTA selon `resolveInvoiceKind`
- lien « Voir la réservation »

### Après paiement réussi

Invalider le cache booking (`isPaid: true`) → le prochain download devient **facture** automatiquement (pas besoin de flag local « mode proforma »).

---

## 6. Contenu métier à afficher (aperçu / PDF)

Commun aux deux modèles (depuis invoice JSON + booking) :

- N° document (`id`)
- Client (nom, email, téléphone)
- Service (`Location` / `Transfert aéroport`)
- Véhicule
- Dates départ / arrivée
- **Total** USD
- Lignes détail prix ← depuis `booking.options` (voir `MOBILE-BOOKING-OPTIONS-RECAP.md`)

Spécifique proforma :
- badge non payé
- disclaimer : estimation, ne vaut pas facture définitive

Spécifique facture :
- `paidAt` si payé
- échéance `dueAt` (30 j) si pas encore soldé mais ENDED (ex. différé)

---

## 7. Checklist fichiers Expo

- [ ] `api/booking.ts` — `getBookingInvoice` (+ `getBookingInvoicePdf` plus tard)
- [ ] `constants/dataInterface.ts` — `BookingInvoice`
- [ ] `lib/invoice-kind.ts` — `resolveInvoiceKind` / `invoiceDisplayId`
- [ ] `lib/i18n.ts` — clés proforma / facture
- [ ] `BookingDetailModal` — CTA selon kind
- [ ] (option) écran Facturation liste
- [ ] Share PDF via `expo-file-system` + `expo-sharing`

---

## 8. Résumé une phrase

**L’app mobile ne génère pas deux moteurs PDF : elle demande `/invoice`, lit `proforma`, affiche PRO vs FAC, et télécharge le PDF serveur qui applique déjà le bon modèle.**
