import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/layout/page-shell";
import { RequirePermission } from "@/components/auth/require-permission";
import { usePermissions } from "@/hooks/usePermissions";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  BOOKING_PAYMENT_STATUS_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  formatTravelDate,
  getBookingErrorMessage,
  getBookings,
  type ApiBooking,
} from "@/services/booking-api";

const BOOKING_CSV_HEADERS = [
  "Reference ID",
  "Customer Name",
  "Email",
  "Phone",
  "Package Title",
  "Destination",
  "Travel Date",
  "Total Amount",
  "Paid Amount",
  "Balance Amount",
  "Payment Status",
  "Booking Status",
] as const;

const BOOKING_PDF_HEADERS = [
  "Ref ID",
  "Customer",
  "Package",
  "Travel Date",
  "Total",
  "Paid",
  "Balance",
  "Status",
] as const;

function formatInrValue(amount: number | null | undefined): string {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

function bookingToCsvRow(booking: ApiBooking): string[] {
  return [
    booking.reference || "—",
    booking.name || "—",
    booking.email || "—",
    booking.contact_number || booking.contactNumber || "—",
    booking.package_title || booking.packageTitle || "—",
    booking.destination || "—",
    formatTravelDate(booking.travel_date || booking.travelDate),
    formatInrValue(booking.total_amount_inr ?? booking.totalAmountInr),
    formatInrValue(booking.advance_amount_inr),
    formatInrValue(booking.balance_amount_inr),
    booking.payment_status || booking.paymentStatus || "—",
    booking.status || "—",
  ];
}

function bookingToPdfRow(booking: ApiBooking): string[] {
  return [
    booking.reference || "—",
    booking.name || "—",
    booking.package_title || booking.packageTitle || "—",
    formatTravelDate(booking.travel_date || booking.travelDate),
    formatInrValue(booking.total_amount_inr ?? booking.totalAmountInr),
    formatInrValue(booking.advance_amount_inr),
    formatInrValue(booking.balance_amount_inr),
    booking.status || "—",
  ];
}

function titleCase(value: string): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function paymentBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "captured" || normalized === "paid") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (normalized === "pending" || normalized === "authorized") {
    return "border-amber-400/30 bg-amber-500/15 text-amber-800 dark:text-amber-200";
  }
  if (normalized === "failed") {
    return "border-red-400/30 bg-red-500/15 text-red-700 dark:text-red-300";
  }
  if (normalized === "refunded") {
    return "border-sky-400/30 bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  return "border-white/20 bg-white/10 text-muted-foreground";
}

function bookingStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "confirmed") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (normalized === "pending") {
    return "border-amber-400/30 bg-amber-500/15 text-amber-800 dark:text-amber-200";
  }
  if (normalized === "cancelled") {
    return "border-red-400/30 bg-red-500/15 text-red-700 dark:text-red-300";
  }
  if (normalized === "refunded") {
    return "border-violet-400/30 bg-violet-500/15 text-violet-700 dark:text-violet-300";
  }
  return "border-white/20 bg-white/10 text-foreground";
}

function GlassBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize backdrop-blur-sm",
        className
      )}
    >
      {titleCase(label)}
    </span>
  );
}

export function BookingsPage() {
  const { canView } = usePermissions();
  const canViewBookings = canView("Bookings");

  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim().replace(/\s+/g, " "));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getBookings({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter,
        payment_status: paymentStatusFilter,
      });
      setBookings(response.data.bookings);
      const pagination = response.data.pagination;
      setTotal(pagination?.total ?? response.total ?? 0);
      setPages(pagination?.pages ?? response.pages ?? 1);
    } catch (error) {
      toast.error(getBookingErrorMessage(error, "Failed to load bookings."));
      setBookings([]);
      setTotal(0);
      setPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    if (!canViewBookings) return;
    void loadBookings();
  }, [canViewBookings, loadBookings]);

  async function fetchBookingsForExport(): Promise<ApiBooking[]> {
    const response = await getBookings({
      page: 1,
      limit: 10000,
      search: debouncedSearch || undefined,
      status: statusFilter,
      payment_status: paymentStatusFilter,
    });
    return response.data.bookings;
  }

  async function handleExportCSV() {
    setIsExporting(true);
    try {
      const exportBookings = await fetchBookingsForExport();
      if (exportBookings.length === 0) {
        toast.error("No bookings to export.");
        return;
      }

      const csvRows = [
        BOOKING_CSV_HEADERS.join(","),
        ...exportBookings.map((booking) =>
          bookingToCsvRow(booking)
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];

      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Bookings_Export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${exportBookings.length} bookings to CSV.`);
    } catch (error) {
      toast.error(getBookingErrorMessage(error, "Failed to export bookings."));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      const exportBookings = await fetchBookingsForExport();
      if (exportBookings.length === 0) {
        toast.error("No bookings to export.");
        return;
      }

      const doc = new jsPDF("l", "pt", "a4");
      doc.setFontSize(14);
      doc.text("Musafir Bookings Report", 40, 36);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 50);

      autoTable(doc, {
        head: [BOOKING_PDF_HEADERS as unknown as string[]],
        body: exportBookings.map((booking) => bookingToPdfRow(booking)),
        startY: 60,
        styles: {
          fontSize: 7,
          cellPadding: 3,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
        },
        horizontalPageBreak: true,
      });

      doc.save("Bookings_Report.pdf");
      toast.success(`Exported ${exportBookings.length} bookings to PDF.`);
    } catch (error) {
      toast.error(getBookingErrorMessage(error, "Failed to export bookings."));
    } finally {
      setIsExporting(false);
    }
  }

  if (!canViewBookings) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <PageShell
      title="Bookings"
      description="Confirmed trip bookings from website checkout and payments."
      actions={
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md dark:border-white/10">
          <CalendarCheck className="size-3.5" />
          {total} total
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, reference, or email..."
              className="glass-control h-9 pl-8"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                if (value) {
                  setStatusFilter(value);
                  setPage(1);
                }
              }}
              items={BOOKING_STATUS_OPTIONS.map((status) => ({
                value: status,
                label: status === "all" ? "All statuses" : titleCase(status),
              }))}
            >
              <SelectTrigger className="glass-control w-full sm:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass-popover">
                {BOOKING_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All statuses" : titleCase(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentStatusFilter}
              onValueChange={(value) => {
                if (value) {
                  setPaymentStatusFilter(value);
                  setPage(1);
                }
              }}
              items={BOOKING_PAYMENT_STATUS_OPTIONS.map((status) => ({
                value: status,
                label:
                  status === "all"
                    ? "All payment statuses"
                    : titleCase(status),
              }))}
            >
              <SelectTrigger className="glass-control w-full sm:w-[190px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="glass-popover">
                {BOOKING_PAYMENT_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all"
                      ? "All payment statuses"
                      : titleCase(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <RequirePermission module="Bookings" action="export">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isExporting}
                      className="w-full border border-white/20 bg-white/10 text-foreground transition-all hover:bg-white/20 sm:w-auto dark:text-white"
                    >
                      <Download className="size-4" />
                      Export
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="glass-popover">
                  <DropdownMenuItem
                    disabled={isExporting}
                    onClick={() => void handleExportCSV()}
                  >
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isExporting}
                    onClick={() => void handleExportPDF()}
                  >
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </RequirePermission>
          </div>
        </div>

        <div className="glass-panel no-scrollbar min-h-0 flex-1 overflow-hidden rounded-xl">
          {isLoading ? (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl border border-white/15 bg-white/10"
                  />
                ))}
              </div>
              <div className="hidden p-4 md:block">
                <TableSkeleton rows={8} columns={8} />
              </div>
            </>
          ) : bookings.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center px-4 py-10">
              <p className="text-center text-sm text-muted-foreground">
                No bookings match your filters.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 overflow-y-auto p-3 md:hidden">
                {bookings.map((booking) => {
                  const contactLine =
                    booking.email ||
                    booking.contact_number ||
                    booking.contactNumber ||
                    "—";
                  const packageTitle =
                    booking.package_title || booking.packageTitle || "—";
                  const totalAmount =
                    booking.total_amount_inr ?? booking.totalAmountInr ?? 0;
                  const paidAmount = booking.advance_amount_inr ?? 0;
                  const balanceAmount = booking.balance_amount_inr ?? 0;
                  const pax =
                    booking.number_of_pax ?? booking.numberOfPax ?? 1;
                  const paymentStatus =
                    booking.payment_status || booking.paymentStatus || "—";

                  return (
                    <article
                      key={booking._id}
                      className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                            {booking.reference || "—"}
                          </p>
                          <p className="mt-0.5 truncate font-medium text-foreground">
                            {booking.name || "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {contactLine}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <GlassBadge
                            label={paymentStatus}
                            className={paymentBadgeClass(paymentStatus)}
                          />
                          <GlassBadge
                            label={booking.status || "—"}
                            className={bookingStatusBadgeClass(
                              booking.status || ""
                            )}
                          />
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
                            {packageTitle}
                          </p>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            ₹{totalAmount.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {booking.destination || "—"}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {formatTravelDate(
                              booking.travel_date || booking.travelDate
                            )}
                          </span>
                          <span>·</span>
                          <span>{pax} pax</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs tabular-nums">
                          <span className="text-muted-foreground">
                            Paid{" "}
                            <span className="font-medium text-foreground">
                              ₹{paidAmount.toLocaleString("en-IN")}
                            </span>
                          </span>
                          <span
                            className={
                              balanceAmount > 0
                                ? "text-red-500/90 dark:text-red-400"
                                : "text-muted-foreground"
                            }
                          >
                            Balance{" "}
                            <span className="font-medium">
                              ₹{balanceAmount.toLocaleString("en-IN")}
                            </span>
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden min-h-0 flex-1 overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/15 bg-white/10 hover:bg-white/10 dark:border-white/10 dark:bg-white/5">
                      <TableHead className="text-muted-foreground">
                        Reference ID
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Customer
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Package & Total
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Paid Amount
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Balance
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Travel Date & Pax
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Payment Status
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Booking Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const contactLine =
                        booking.email ||
                        booking.contact_number ||
                        booking.contactNumber ||
                        "—";
                      const packageTitle =
                        booking.package_title || booking.packageTitle || "—";
                      const totalAmount =
                        booking.total_amount_inr ??
                        booking.totalAmountInr ??
                        0;
                      const paidAmount = booking.advance_amount_inr ?? 0;
                      const balanceAmount = booking.balance_amount_inr ?? 0;

                      return (
                        <TableRow
                          key={booking._id}
                          className="border-white/10 hover:bg-white/10 dark:hover:bg-white/5"
                        >
                          <TableCell>
                            <span className="font-semibold tracking-tight text-foreground">
                              {booking.reference || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[160px]">
                              <p className="font-medium text-foreground">
                                {booking.name || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contactLine}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="min-w-[180px]">
                              <div className="text-sm font-medium text-foreground">
                                {packageTitle}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{booking.destination || "—"}</span>
                                <span className="size-1 shrink-0 rounded-full bg-white/30 dark:bg-gray-500" />
                                <span className="font-semibold tabular-nums text-foreground/80 dark:text-gray-200">
                                  ₹{totalAmount.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums text-foreground/70 dark:text-gray-300">
                            ₹{paidAmount.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums">
                            <span
                              className={
                                balanceAmount > 0
                                  ? "font-medium text-red-500/90 dark:text-red-400"
                                  : "text-muted-foreground dark:text-gray-400"
                              }
                            >
                              ₹{balanceAmount.toLocaleString("en-IN")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[120px]">
                              <p className="text-sm text-foreground">
                                {formatTravelDate(
                                  booking.travel_date || booking.travelDate
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {booking.number_of_pax ??
                                  booking.numberOfPax ??
                                  1}{" "}
                                pax
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <GlassBadge
                              label={
                                booking.payment_status ||
                                booking.paymentStatus ||
                                "—"
                              }
                              className={paymentBadgeClass(
                                booking.payment_status ||
                                  booking.paymentStatus ||
                                  ""
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <GlassBadge
                              label={booking.status || "—"}
                              className={bookingStatusBadgeClass(
                                booking.status || ""
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {from}-{to} of {total}
          </p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="glass-control"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="size-4" />
              <span className="sm:inline">Previous</span>
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {page} / {Math.max(pages, 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="glass-control"
              disabled={page >= pages || isLoading || total === 0}
              onClick={() => setPage((prev) => prev + 1)}
            >
              <span className="sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default BookingsPage;
