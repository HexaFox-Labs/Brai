"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import { Timer } from "lucide-react";
import type { TimerSession } from "@/shared/types/timer";
import { Badge } from "@/shared/ui/badge";
import { CardFrame } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/shared/ui/table";
import { cx } from "../../appUtils";
import { focusHistoryRows, type FocusHistoryRow } from "./focusHistoryModel";

const focusHistoryColumns: ColumnDef<FocusHistoryRow>[] = [
  {
    accessorKey: "departureTime",
    cell: ({ row }) => {
      return (
        <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] items-center gap-2 font-normal tabular-nums">
          <div className="justify-self-start">{row.original.departureTime}</div>
          <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-center text-muted-foreground before:border-muted-foreground before:border-t before:border-dashed before:opacity-55 after:border-muted-foreground after:border-t after:border-dashed after:opacity-55">
            <span className="shrink-0 font-medium text-primary">{row.original.duration}</span>
          </div>
          <div className="justify-self-end text-right">{row.original.arrivalTime}</div>
        </div>
      );
    },
    header: "Time",
    size: 168,
  },
  {
    accessorKey: "destination",
    cell: ({ row }) => (
      <div className="min-w-0 overflow-hidden font-medium [mask-image:linear-gradient(to_right,#000_calc(100%-1.25rem),transparent)]">
        {row.getValue<string>("destination")}
      </div>
    ),
    header: "Destination",
    size: 176,
  },
  {
    id: "terminal",
    cell: () => (
      <Badge aria-label="Фокус" className="h-7 min-w-7 px-0 font-normal tabular-nums" size="lg" title="Фокус" variant="outline">
        <Timer aria-hidden="true" />
      </Badge>
    ),
    header: "Terminal",
    size: 34,
  },
];

export function FocusHistoryTable({ sessions }: { sessions: TimerSession[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      desc: true,
      id: "departureTime",
    },
  ]);
  const rows = useMemo<FocusHistoryRow[]>(
    () => focusHistoryRows(sessions),
    [sessions],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns handler functions by design.
  const table = useReactTable({
    columns: focusHistoryColumns,
    data: rows,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <CardFrame className="w-full">
      <Table variant="card" className="table-fixed">
        <colgroup>
          <col style={{ width: `${focusHistoryColumns[0].size}px` }} />
          <col />
          <col style={{ width: `${focusHistoryColumns[2].size}px` }} />
        </colgroup>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    className={cx(
                      cell.column.id === "destination" && "min-w-0 px-1.5",
                      cell.column.id === "departureTime" && "px-1.5",
                      cell.column.id === "terminal" && "px-0.5 text-center",
                    )}
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center" colSpan={focusHistoryColumns.length}>
                Сессий нет.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardFrame>
  );
}
