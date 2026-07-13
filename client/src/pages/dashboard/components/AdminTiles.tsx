import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { AdminTile } from "../dashboard.constants"

interface AdminTilesProps {
  tiles: AdminTile[]
}

/** Grid of admin shortcut cards (review, coverage, team, reports, …). */
export function AdminTiles({ tiles }: AdminTilesProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
          <Card key={tile.href} className="group">
            <CardHeader className="pb-2">
              <CardDescription className="operations-label">
                {tile.count != null
                  ? `${tile.count} ${tile.countLabel}`
                  : "Shortcut"}
              </CardDescription>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Icon className="size-4 text-muted-foreground" />
                {tile.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-3">
              <p className="text-muted-foreground leading-5">{tile.description}</p>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link to={tile.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
