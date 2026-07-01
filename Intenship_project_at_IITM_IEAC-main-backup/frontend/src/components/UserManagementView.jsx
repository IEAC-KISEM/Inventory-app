import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Phone, Mail, KeyRound, User, CheckCircle2, AlertCircle, Trash2 } from "lucide-react"

export default function UserManagementView({ currentUser }) {
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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, role })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`User "${name}" created successfully.`)
        setName("")
        setEmail("")
        setPhone("")
        setPassword("")
        setRole("engineer")
        fetchUsers()
      } else {
        setError(data.error || "Failed to create user.")
      }
    } catch (err) {
      console.error("Error creating user", err)
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
        {/* Create User Form */}
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Register User
            </CardTitle>
            <CardDescription>Their Mail ID will act as their Login ID.</CardDescription>
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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
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
                  <option value="admin">Administrator</option>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 cursor-pointer font-semibold"
                disabled={loading}
              >
                {loading ? "Registering..." : "Create Account"}
              </Button>
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
            <div className="rounded-md border">
              <Table>
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
                          variant={u.role === "admin" ? "success" : "secondary"}
                          className="capitalize text-[10px]"
                        >
                          {u.role === "admin" ? "Admin" : "Engineer"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Disable delete for primary admin and for current logged-in user */}
                        {u.email !== 'admin' && String(u.id) !== String(currentUser?.id) ? (
                          <div className="flex justify-end items-center gap-1.5">
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
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 italic pr-1">—</span>
                        )}
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
    </div>
  )
}
