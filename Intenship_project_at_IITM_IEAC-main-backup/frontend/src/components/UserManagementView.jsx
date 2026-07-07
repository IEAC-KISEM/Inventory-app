import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Phone, Mail, KeyRound, User, CheckCircle2, AlertCircle, Trash2, Database, Download, AlertTriangle, Edit3 } from "lucide-react"

export default function UserManagementView({ currentUser, offerDownload }) {
  const isPrimaryAdmin = currentUser?.email?.toLowerCase() === "admin"

  const [users, setUsers] = useState([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("engineer")
  
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  const startEdit = (userToEdit) => {
    setSuccess("")
    setError("")
    setEditingUser(userToEdit)
    setName(userToEdit.name || "")
    setEmail(userToEdit.email || "")
    setPhone(userToEdit.phone || "")
    setPassword("")
    setRole(userToEdit.role || "engineer")
  }

  const cancelEdit = () => {
    setSuccess("")
    setError("")
    setEditingUser(null)
    setName("")
    setEmail("")
    setPhone("")
    setPassword("")
    setRole("engineer")
  }

  // System Maintenance States
  const [extractStart, setExtractStart] = useState("")
  const [extractEnd, setExtractEnd] = useState("")
  const [clearStart, setClearStart] = useState("")
  const [clearEnd, setClearEnd] = useState("")
  const [confirmClear, setConfirmClear] = useState(false)
  const [systemSuccess, setSystemSuccess] = useState("")
  const [systemError, setSystemError] = useState("")

  const handleExtract = async (e) => {
    e.preventDefault()
    setSystemSuccess("")
    setSystemError("")
    if (!extractStart || !extractEnd) {
      setSystemError("Please select both from and to dates.")
      return
    }
    if (new Date(extractEnd) < new Date(extractStart)) {
      setSystemError("End date cannot be before start date.")
      return
    }
    try {
      const res = await fetch(`/api/admin/extract-bookings?start=${extractStart}&end=${extractEnd}`)
      const data = await res.json()
      if (res.ok && data.sheet) {
        setSystemSuccess("Spreadsheet generated successfully. Starting download...")
        offerDownload(data.sheet)
      } else {
        setSystemError(data.error || "Failed to extract booking records.")
      }
    } catch (err) {
      console.error("Extract failed", err)
      setSystemError("Failed to connect to the server.")
    }
  }

  const handleClear = async (e) => {
    e.preventDefault()
    setSystemSuccess("")
    setSystemError("")

    const isClearAll = !clearStart && !clearEnd
    if (!isClearAll && (!clearStart || !clearEnd)) {
      setSystemError("Please select both from and to dates, or clear all history by leaving the fields empty.")
      return
    }
    if (!isClearAll && new Date(clearEnd) < new Date(clearStart)) {
      setSystemError("End date cannot be before start date.")
      return
    }

    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => {
        setConfirmClear(false)
      }, 5000)
      return
    }

    setConfirmClear(false)
    try {
      const res = await fetch("/api/admin/clear-bookings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: clearStart || null, end: clearEnd || null })
      })
      const data = await res.json()
      if (res.ok) {
        setSystemSuccess(`Successfully cleared ${data.count} booking records from history.`)
        setClearStart("")
        setClearEnd("")
      } else {
        setSystemError(data.error || "Failed to clear booking records.")
      }
    } catch (err) {
      console.error("Clear failed", err)
      setSystemError("Failed to connect to the server.")
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess("")
    setError("")
    setLoading(true)

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"

      const payload = { name, email, phone, role }
      if (password) {
        payload.password = password
      } else if (!editingUser) {
        setError("Password is required for new users.")
        setLoading(false)
        return
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        if (editingUser) {
          setSuccess(`User "${name}" updated successfully.`)
          cancelEdit()
        } else {
          setSuccess(`User "${name}" created successfully.`)
          setName("")
          setEmail("")
          setPhone("")
          setPassword("")
          setRole("engineer")
        }
        fetchUsers()
      } else {
        setError(data.error || `Failed to ${editingUser ? 'update' : 'create'} user.`)
      }
    } catch (err) {
      console.error(`Error ${editingUser ? 'updating' : 'creating'} user`, err)
      setError("Server connection failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId, userName) => {
    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId)
      // Auto-reset confirmation check after 5s
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === userId ? null : prev)
      }, 5000)
      return
    }
    setConfirmDeleteId(null)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`User "${userName}" removed.`)
        fetchUsers()
      } else {
        setError(data.error || "Failed to remove user.")
      }
    } catch (err) {
      console.error("Error deleting user", err)
      setError("Server connection failed.")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="text-muted-foreground">Add new administrators or engineers to the system and view profiles.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create / Edit User Form */}
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {editingUser ? "Edit User Profile" : "Register User"}
            </CardTitle>
            <CardDescription>
              {editingUser ? `Updating details for "${editingUser.name}"` : "Their Mail ID will act as their Login ID."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <div className="p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}
              {error && (
                <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="name"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Mail ID (Login ID)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. john@iitm.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="phone"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{editingUser ? "New Password" : "Password"}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-background border"
                >
                  <option value="engineer">Engineer</option>
                  <option value="trainee">Trainee</option>
                  <option value="admin">Administrator</option>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 cursor-pointer font-semibold"
                disabled={loading}
              >
                {loading ? (editingUser ? "Saving..." : "Registering...") : (editingUser ? "Save Changes" : "Create Account")}
              </Button>

              {editingUser && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-1.5 cursor-pointer font-semibold text-muted-foreground"
                  onClick={cancelEdit}
                >
                  Cancel Edit
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Users List Table */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Registered Accounts
            </CardTitle>
            <CardDescription>A list of all users registered on this platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[600px] sm:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mail ID / Login ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold text-foreground">{u.name}</TableCell>
                      <TableCell className="font-mono text-xs">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">{u.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "admin" ? "success" : u.role === "trainee" ? "secondary" : "default"}
                          className="capitalize text-[10px]"
                        >
                          {u.role === "admin" ? "Admin" : u.role === "trainee" ? "Trainee" : "Engineer"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {isPrimaryAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                              title={`Edit ${u.name}`}
                              onClick={() => startEdit(u)}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {/* Disable delete for primary admin and for current logged-in user */}
                          {u.email !== 'admin' && String(u.id) !== String(currentUser?.id) ? (
                            <>
                              {confirmDeleteId === u.id && (
                                <span className="text-[10px] font-bold text-destructive animate-pulse">Confirm?</span>
                              )}
                              <Button
                                size="sm"
                                variant={confirmDeleteId === u.id ? "destructive" : "ghost"}
                                className={`h-7 transition-all cursor-pointer font-semibold ${
                                  confirmDeleteId === u.id ? "px-2 text-xs" : "w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                }`}
                                title={confirmDeleteId === u.id ? "Click again to confirm delete" : `Remove ${u.name}`}
                                onClick={() => handleDelete(u.id, u.name)}
                              >
                                {confirmDeleteId === u.id ? "Yes" : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            </>
                          ) : (
                            !isPrimaryAdmin && <span className="text-[10px] text-muted-foreground/40 italic pr-1">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No registered users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Data Operations (Admin Only) */}
      <Card className="shadow-sm border-l-4 border-l-amber-500 mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            System Data Maintenance (Admin Only)
          </CardTitle>
          <CardDescription>
            Extract checkout/booking records to Excel spreadsheet logs, or clear old transaction records from database within a specified date limit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemSuccess && (
            <div className="p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{systemSuccess}</span>
            </div>
          )}
          {systemError && (
            <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
              <span>{systemError}</span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Extract Form */}
            <div className="bg-muted/10 border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Download className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Extract Booking Logs</h3>
              </div>
              <form onSubmit={handleExtract} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="extractStart" className="text-xs">From Date</Label>
                    <Input
                      id="extractStart"
                      type="date"
                      value={extractStart}
                      onChange={(e) => setExtractStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="extractEnd" className="text-xs">To Date</Label>
                    <Input
                      id="extractEnd"
                      type="date"
                      value={extractEnd}
                      onChange={(e) => setExtractEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full text-xs font-semibold mt-2 cursor-pointer">
                  Generate & Download Excel
                </Button>
              </form>
            </div>

            {/* Clear Form */}
            <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 border-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="font-semibold text-sm text-destructive">Clear Transaction History</h3>
              </div>
              <form onSubmit={handleClear} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="clearStart" className="text-xs text-destructive">From Date</Label>
                    <Input
                      id="clearStart"
                      type="date"
                      value={clearStart}
                      onChange={(e) => setClearStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clearEnd" className="text-xs text-destructive">To Date</Label>
                    <Input
                      id="clearEnd"
                      type="date"
                      value={clearEnd}
                      onChange={(e) => setClearEnd(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant={confirmClear ? "destructive" : "outline"}
                  className={`w-full text-xs font-semibold mt-2 cursor-pointer transition-all ${
                    confirmClear ? "bg-destructive text-white animate-pulse" : "text-destructive hover:bg-destructive/10 border-destructive/20"
                  }`}
                >
                  {confirmClear ? "Click again to Confirm Permanent Clear" : "Clear History"}
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
