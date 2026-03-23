import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type DatasetColumn<Row extends Record<string, unknown>> = {
  key: keyof Row & string
  label?: string
  headerClassName?: string
  cellClassName?: string
  render?: (value: unknown, row: Row) => ReactNode
}

type DatasetPreviewProps<Row extends Record<string, unknown>> = {
  id?: string
  eyebrow?: string
  title: string
  metaLabel?: string
  statusLabel?: string
  tone?: "dark" | "light"
  columns: DatasetColumn<Row>[]
  rows: Row[]
  rowKey: keyof Row & string
  className?: string
  contentClassName?: string
  tableClassName?: string
}

export function DatasetPreview<Row extends Record<string, unknown>>({
  id,
  eyebrow = "Dataset",
  title,
  metaLabel,
  statusLabel = "Scrollable preview",
  tone = "dark",
  columns,
  rows,
  rowKey,
  className,
  contentClassName,
  tableClassName,
}: DatasetPreviewProps<Row>) {
  const isLightTone = tone === "light"

  return (
    <div
      id={id}
      className={cn(
        isLightTone
          ? "flex min-h-0 min-w-0 flex-col overflow-hidden border border-black/10 bg-[#f7f2e8] shadow-2xl shadow-[#cec4b4]/30"
          : "flex min-h-0 min-w-0 flex-col overflow-hidden border border-white/12 bg-black/40 shadow-2xl shadow-black/40",
        className
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em]",
          isLightTone ? "text-[#746a5d]" : "text-[#bdb8aa]"
        )}
      >
        <span>{eyebrow}</span>
      </div>

      <div
        className={cn(
          isLightTone
            ? "flex min-h-0 flex-1 flex-col overflow-hidden border border-black/10 bg-[#fffaf1]"
            : "flex min-h-0 flex-1 flex-col overflow-hidden border border-white/10 bg-[#111111]",
          contentClassName
        )}
      >
        <div
          className={cn(
            "px-4 py-4",
            isLightTone ? "border-b border-black/10" : "border-b border-white/10"
          )}
        >
          <div
            className={cn(
              "text-[15px] uppercase tracking-[0.22em]",
              isLightTone ? "text-[#151311]" : "text-[#f2f1ea]"
            )}
          >
            {title}
          </div>
        </div>

        <div
          className={cn(
            "px-4 py-3",
            isLightTone ? "border-b border-black/10" : "border-b border-white/10"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-4 text-[12px] uppercase tracking-[0.2em]",
              isLightTone ? "text-[#746a5d]" : "text-[#9bb0c7]"
            )}
          >
            <span>{metaLabel ?? `Columns (${columns.length})`}</span>
            <span>{statusLabel}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table
            className={cn(
              "min-w-max border-collapse text-left text-[12px]",
              tableClassName
            )}
          >
            <thead
              className={cn(
                "sticky top-0 z-10",
                isLightTone
                  ? "bg-[#eee4d5] text-[#655b4f]"
                  : "bg-[#12151b] text-[#9bb0c7]"
              )}
            >
              <tr
                className={cn(
                  isLightTone ? "border-b border-black/10" : "border-b border-white/10"
                )}
              >
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 font-normal",
                      column.headerClassName
                    )}
                  >
                    {column.label ?? column.key}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={cn(isLightTone ? "text-[#1d1916]" : "text-[#e8ecf2]")}>
              {rows.map((row) => (
                <tr
                  key={String(row[rowKey])}
                  className={cn(
                    "last:border-b-0",
                    isLightTone ? "border-b border-black/8" : "border-b border-white/8"
                  )}
                >
                  {columns.map((column) => {
                    const value = row[column.key]

                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "whitespace-nowrap px-4 py-3",
                          column.cellClassName
                        )}
                      >
                        {column.render ? column.render(value, row) : String(value)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
