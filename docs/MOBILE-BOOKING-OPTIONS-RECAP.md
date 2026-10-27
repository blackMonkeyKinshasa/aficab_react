# Guide Expo Client — Options réservation & récap prix

Cible : `C:\Users\hp\Documents\projet_expo\Aficab`  
Contrat API : `POST /api/booking` + `GET /api/booking/:id` (ou liste `?clientId=`).

---

## 1. Problème actuel (LocDaily)

Aujourd’hui le mobile envoie souvent :

```ts
options: {
  fuel: 25,      // ❌ ignoré par Zod
  flex: 40,      // ❌ ignoré
  premium: 0,    // ❌ ignoré
  rentalDays: 3  // ❌ ignoré
}
```

Le backend **ne persiste que** :

```ts
options?: {
  extraTime?: { name: string; price: number };
  dayExtensions?: Array<{ day: string; type: "flex" | "premium" }>;
  options?: Array<{ name: string; price: number; number: number; required?: boolean }>;
}
```

Résultat : `Booking.options` reste `null` → impossible de détailler le récap à la relecture. Seul `total` survit.

---

## 2. Comment ENVOYER à la création (`POST /booking`)

### 2.1 Types à aligner (`constants/dataInterface.ts`)

```ts
export type BookingOptionLine = {
  name: string;   // ex. "Carburant" — doit matcher Car.priceOptions[].name
  price: number;  // prix unitaire catalogue (USD / jour pour LOC)
  number: number; // quantité (1 = sélectionné)
  required?: boolean;
};

export type BookingDayExtension = {
  day: string;              // "YYYY-MM-DD"
  type: "flex" | "premium";
};

export type BookingOptionsPayload = {
  /** Lignes catalogue (carburant, siège bébé, …) */
  options?: BookingOptionLine[];
  /** Legacy : un seul bloc heures sup. (tarif journalier) */
  extraTime?: { name: string; price: number } | null;
  /** Modèle C (recommandé LOC) : Flex/Premium par jour */
  dayExtensions?: BookingDayExtension[];
};
```

Retirer `fuel` / `flex` / `premium` du payload API (garder en state UI local uniquement).

### 2.2 Mapping depuis l’UI LocDaily

Prix catalogue depuis la voiture sélectionnée (`GET /car-algo` ou `GET /car/:id`) :

- carburant → `car.priceOptions` (name contient `carburant` / `fuel`)
- flex / premium → `car.extraTime.flex` / `car.extraTime.premium`

```ts
function buildBookingOptions(args: {
  fuelSelected: boolean;
  fuelUnitPrice: number | null;      // depuis car.priceOptions
  flexSelected: boolean;             // legacy global
  premiumSelected: boolean;
  flexUnitPrice: number | null;      // car.extraTime.flex
  premiumUnitPrice: number | null;
  /** Si UI jour-par-jour dispo */
  dayExtensions?: Array<{ day: string; type: "flex" | "premium" }>;
}): BookingOptionsPayload {
  const lines: BookingOptionLine[] = [];

  if (args.fuelSelected && args.fuelUnitPrice != null) {
    lines.push({
      name: "Carburant", // même libellé que Car.priceOptions[].name
      price: args.fuelUnitPrice,
      number: 1,
    });
  }

  const out: BookingOptionsPayload = {};
  if (lines.length) out.options = lines;

  // Préférer dayExtensions si disponibles
  if (args.dayExtensions?.length) {
    out.dayExtensions = args.dayExtensions;
    // Optionnel : aussi un extraTime résumé (compat affichage ancien)
    const hasPremium = args.dayExtensions.some((d) => d.type === "premium");
    const hasFlex = args.dayExtensions.some((d) => d.type === "flex");
    if (hasPremium && args.premiumUnitPrice) {
      out.extraTime = { name: "Premium", price: args.premiumUnitPrice };
    } else if (hasFlex && args.flexUnitPrice) {
      out.extraTime = { name: "Flex", price: args.flexUnitPrice };
    }
    return out;
  }

  // Legacy : un Flex OU Premium pour toute la LOC
  if (args.premiumSelected && args.premiumUnitPrice != null) {
    out.extraTime = { name: "Premium", price: args.premiumUnitPrice };
  } else if (args.flexSelected && args.flexUnitPrice != null) {
    out.extraTime = { name: "Flex", price: args.flexUnitPrice };
  }

  return out;
}
```

### 2.3 Exemple body `POST /booking` (extrait)

```json
{
  "id": "…",
  "type": "LOC",
  "carId": "…",
  "clientId": "…",
  "total": 465,
  "departureAt": "2026-10-28T07:30:00.000Z",
  "arrivalAt": "2026-10-30T19:00:00.000Z",
  "options": {
    "options": [
      { "name": "Carburant", "price": 25, "number": 1 }
    ],
    "extraTime": { "name": "Flex", "price": 40 },
    "dayExtensions": [
      { "day": "2026-10-28", "type": "flex" },
      { "day": "2026-10-29", "type": "flex" }
    ]
  }
}
```

**Important :** le serveur **réécrit** `options[].price` avec le catalogue `Car.priceOptions` avant insert. Le `name` doit matcher (case-insensitive).

---

## 3. Comment RÉCUPÉRER pour le détail / récap

### 3.1 Source

```ts
const booking = await getBookingById(id);
// ou item de getAllBookings(clientId)

const opts = booking.options; // Json | null
const total = booking.total;
const days = rentalDays(booking.departureAt, booking.arrivalAt); // LOC
```

`car` est souvent inclus (`priceLOC`, `extraTime`, `priceOptions`) → utile si `dayExtensions` sans montants stockés.

### 3.2 Forme typique renvoyée

```ts
type StoredOptions = {
  options?: Array<{ name: string; price: number; number: number; required?: boolean }>;
  extraTime?: { name: string; price: number };
  dayExtensions?: Array<{ day: string; type: "flex" | "premium" }>;
};
```

### 3.3 Helper récap (à mettre dans `lib/recap-format.ts` ou `reservation-helpers.ts`)

```ts
type RecapLine = { label: string; amount: number };

function rentalDays(departureAt?: string | null, arrivalAt?: string | null) {
  // aligner sur web : au moins 1 jour calendaire
  if (!departureAt || !arrivalAt) return 1;
  const start = new Date(departureAt);
  const end = new Date(arrivalAt);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function buildPriceRecap(booking: {
  total?: number | null;
  type?: string;
  departureAt?: string | null;
  arrivalAt?: string | null;
  options?: StoredOptions | null;
  car?: {
    priceLOC?: number | null;
    extraTime?: { flex?: number; premium?: number } | null;
  } | null;
  coupon?: { discountAmount?: number } | null;
}): RecapLine[] {
  const lines: RecapLine[] = [];
  const days = booking.type === "LOC"
    ? rentalDays(booking.departureAt, booking.arrivalAt)
    : 1;
  const opts = booking.options ?? {};

  // 1) Options catalogue (carburant, …) — prix unitaire × qty × jours LOC
  for (const item of opts.options ?? []) {
    if (!item.number || item.number <= 0) continue;
    const amount = Number(item.price) * Number(item.number) * days;
    if (amount <= 0) continue;
    lines.push({ label: item.name, amount });
  }

  // 2) Heures sup.
  if (opts.dayExtensions?.length && booking.car?.extraTime) {
    const flex = Number(booking.car.extraTime.flex) || 0;
    const premium = Number(booking.car.extraTime.premium) || 0;
    for (const ext of opts.dayExtensions) {
      const amount = ext.type === "premium" ? premium : flex;
      if (amount <= 0) continue;
      lines.push({
        label: `${ext.type === "premium" ? "Premium" : "Flex"} · ${ext.day.slice(5)}`,
        amount,
      });
    }
  } else if (opts.extraTime?.price) {
    // Legacy stocké : price = tarif journalier → × jours
    const amount = Number(opts.extraTime.price) * days;
    lines.push({
      label: opts.extraTime.name || "Heures supplémentaires",
      amount,
    });
  }

  const extras = lines.reduce((s, l) => s + l.amount, 0);
  const discount = Number(booking.coupon?.discountAmount) || 0;
  const total = Number(booking.total) || 0;

  // 3) Véhicule = total − extras + discount (approx. si total déjà net coupon)
  const vehicle = Math.max(0, total - extras + discount);
  const out: RecapLine[] = [
    {
      label: booking.type === "LOC"
        ? `Location · ${days} jour(s)`
        : "Transfert",
      amount: vehicle,
    },
    ...lines,
  ];
  if (discount > 0) {
    out.push({ label: "Remise coupon", amount: -discount });
  }
  out.push({ label: "Total", amount: total });
  return out;
}
```

### 3.4 Affichage détail (`BookingDetailModal`)

Remplacer la logique actuelle basée sur `bookingOptions.fuel` / `.flex` / `.premium` par :

```ts
const recap = buildPriceRecap(booking);
// mapper vers BookingRecapPriceSection
```

Fallback si `booking.options == null` (anciennes résas mobile) :

```ts
if (!booking.options) {
  // afficher seulement total + mention
  // "Détail indisponible (réservation créée avant alignement options)"
}
```

---

## 4. Formules (même logique que `lib/booking-quote.ts`)

| Ligne | Calcul |
|--------|--------|
| Option catalogue LOC | `price × number × jours` |
| Option catalogue TA | `price × number` (jours = 1) |
| `extraTime` legacy | `extraTime.price × jours` |
| `dayExtensions` | somme des tarifs `car.extraTime.flex/premium` **par jour** (pas × jours globaux) |
| Coupon | `BookingCoupon.discountAmount` (relation) |
| Total | champ `booking.total` (fait foi) |

---

## 5. Checklist fichiers Expo

1. `constants/dataInterface.ts` — `BookingOptionsPayload` conforme API  
2. `components/my-ui/LocDaily.tsx` — `buildBookingOptions(...)` à la place de `{ fuel, flex, premium }`  
3. Idem `LocAirport` / `airport.tsx` si options  
4. `lib/…` ou `reservation-helpers.ts` — `buildPriceRecap`  
5. `components/reservation/BookingDetailModal.tsx` — consommer le récap  
6. Écran RECAP avant paiement — mêmes lignes (cohérent création ↔ détail)

---

## 6. Test rapide

1. Créer une LOC 2 jours + Carburant + Flex  
2. `GET /booking/:id` → `options.options[0].price` et `options.extraTime` non null  
3. Détail mobile : lignes Carburant, Flex, Location, Total = `booking.total`
