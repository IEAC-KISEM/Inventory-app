import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Shield, BookOpen, AlertTriangle } from "lucide-react"

// Simple Animated Counter component
function AnimatedCounter({ to }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (to === 0) {
      setCount(0)
      return
    }
    let start = 0
    const duration = 800
    const step = Math.max(1, Math.floor(to / 30))
    const intervalTime = Math.floor(duration / (to / step || 1))
    
    const timer = setInterval(() => {
      start += step
      if (start >= to) {
        setCount(to)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [to])

  return <span>{count}</span>
}

export default function DashboardView({ instruments }) {
  const [activeDetail, setActiveDetail] = useState('available')
  const totalCount = instruments.length
  const availableList = instruments.filter(i => i.status === 'available')
  const bookedList = instruments.filter(i => i.status === 'booked')
  const dueList = instruments.filter(i => {
    if (!i.nextCalibrationDate) return false
    const dueMs = new Date(i.nextCalibrationDate) - new Date()
    return dueMs >= 0 && dueMs < 15 * 24 * 3600 * 1000
  })
  const availableCount = availableList.length
  const bookedCount = bookedList.length
  const dueCount = dueList.length

  const recentInstruments = instruments.slice(0, 12)

  const isDueSoon = (dateStr) => {
    if (!dateStr) return false
    const dueMs = new Date(dateStr) - new Date()
    return dueMs >= 0 && dueMs < 15 * 24 * 3600 * 1000
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Quick performance statistics and activity updates.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={`hover:shadow-md transition-all duration-300 border-l-4 border-l-primary group cursor-pointer ${activeDetail === 'available' ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
          onClick={() => setActiveDetail('available')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Instruments</CardTitle>
            <Shield className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedCounter to={availableCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for checkout now</p>
          </CardContent>
        </Card>

        <Card
          className={`hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500 group cursor-pointer ${activeDetail === 'booked' ? 'ring-2 ring-amber-300/30 bg-amber-100/20' : ''}`}
          onClick={() => setActiveDetail('booked')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Booked Instruments</CardTitle>
            <BookOpen className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedCounter to={bookedCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently checked out</p>
          </CardContent>
        </Card>

        <Card
          className={`hover:shadow-md transition-all duration-300 border-l-4 border-l-destructive group cursor-pointer ${activeDetail === 'due' ? 'ring-2 ring-destructive/20 bg-destructive/10' : ''}`}
          onClick={() => setActiveDetail('due')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calibration Due</CardTitle>
            <AlertTriangle className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">
              <AnimatedCounter to={dueCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Due within the next 15 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border border-muted/10">
        <CardHeader>
          <CardTitle className="text-lg font-semibold capitalize">
            {activeDetail === 'available' ? 'Available Instruments' : activeDetail === 'booked' ? 'Booked Instruments' : 'Calibration Due Soon'}
          </CardTitle>
          <CardDescription>
            {activeDetail === 'available' && 'List of instruments ready for immediate checkout.'}
            {activeDetail === 'booked' && 'List of instruments currently booked by users.'}
            {activeDetail === 'due' && 'Instruments with calibration due within 15 days.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(activeDetail === 'available' ? availableList : activeDetail === 'booked' ? bookedList : dueList)
              .slice(0, 6)
              .map((it, idx) => (
                <div key={it.id || idx} className="rounded-2xl border bg-background/80 p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground truncate">{it.name || 'Unknown Instrument'}</h3>
                      <div className="text-[11px] text-muted-foreground mt-1">{it.brand || 'Brand not set'} · {it.model || 'Model not set'}</div>
                    </div>
                    {it.productImages && it.productImages.length > 0 ? (
                      <img src={it.productImages[0]} alt={it.name} className="h-12 w-12 rounded-xl object-cover border" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    {activeDetail === 'due' && (
                      <div>
                        Calibration due <strong className="text-foreground">{Math.max(0, Math.ceil((new Date(it.nextCalibrationDate) - new Date()) / (24 * 3600 * 1000)))}</strong> day(s)
                      </div>
                    )}
                    {activeDetail === 'booked' && it.bookedBy && (
                      <div>Booked by <strong className="text-foreground">{it.bookedBy}</strong></div>
                    )}
                    <div className="text-[11px] text-muted-foreground">Status: <span className="font-medium text-foreground capitalize">{it.status}</span></div>
                  </div>
                </div>
              ))}
            {(activeDetail === 'available' ? availableList : activeDetail === 'booked' ? bookedList : dueList).length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-muted/40 bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                No instruments found for this category.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Instruments</CardTitle>
          <CardDescription>A list of recently tracked instruments in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[600px] sm:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">SNo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInstruments.map((it, idx) => {
                  const urgent = isDueSoon(it.nextCalibrationDate)
                  return (
                    <TableRow 
                      key={it.id || idx} 
                      className={urgent ? "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-950/20 dark:hover:bg-red-950/30" : ""}
                    >
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{it.name}</div>
                        {urgent && (
                          <div className="text-[10px] text-destructive font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Calibration Due Soon
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{it.model || "N/A"}</TableCell>
                      <TableCell className="font-mono text-xs">{it.serial || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={it.status === "available" ? "success" : "warning"}
                          className="capitalize"
                        >
                          {it.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {recentInstruments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No instruments registered yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
