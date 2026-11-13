### Public pages

`/` | Homepage |
`/fahrzeuge` | Vehicle listing |
`/fahrzeuge/[slug]` | Vehicle details — try `/fahrzeuge/volkswagen-tiguan-1` |
`/fahrzeugvergleich` | Vehicle comparison |
`/services` | Services |
`/ueber-uns` | About us |
`/kontakt` | Contact |
`/impressum` | Imprint |
`/datenschutz` | Privacy |
`/agb` | Terms |
`/cookie-einstellungen` | Cookie settings |

### Authentication

- `/login`
- `/register`

### Admin

- `/admin`
- `/admin/vehicles`
- `/admin/vehicles/new`
- `/admin/vehicles/[id]/edit` — try `/admin/vehicles/1/edit`
- `/admin/leads`
- `/admin/appointments`
- `/admin/users`
- `/admin/activity`
- `/admin/media`
- `/admin/settings`

**Testing notes**

- Public English paths such as `/vehicles` and `/contact` redirect to their German equivalents.
- Unknown vehicle slugs or edit IDs should display a 404.
- Admin pages currently have no authentication guard; authentication is UI-only.
- No API route handlers were found.

Sources: `page routes`, `public route configuration`, `redirect logic`.
