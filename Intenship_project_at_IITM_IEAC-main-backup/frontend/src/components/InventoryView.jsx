import React, { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Plus, Edit3, Trash2, ArrowLeft, HelpCircle } from "lucide-react"

export default function InventoryView({ instruments, searchTerm, loadAll }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingInstrument, setEditingInstrument] = useState(null)
  const [activeFormTab, setActiveFormTab] = useState("general")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Form State
  const initialFormState = {
    category: "", name: "", brand: "", model: "", serial: "", location: "warehouse",
    productImages: "", productOverview: "", specifications: "", parametersMeasured: "",
    accuracy: "", measurementRange: "", resolution: "", applications: "",
    operatingProcedure: "", calibrationProcedure: "", safetyInstructions: "",
    userManualUrl: "", youtubeUrl: ""
  }
  const [formData, setFormData] = useState(initialFormState)

  // Filter instruments by search term
  const filteredInstruments = instruments.filter(it => {
    const term = searchTerm.toLowerCase()
    return (
      it.name?.toLowerCase().includes(term) ||
      it.model?.toLowerCase().includes(term) ||
      it.serial?.toLowerCase().includes(term) ||
      it.brand?.toLowerCase().includes(term) ||
      it.category?.toLowerCase().includes(term)
    )
  })

  const isDueSoon = (dateStr) => {
    if (!dateStr) return false
    const dueMs = new Date(dateStr) - new Date()
    return dueMs >= 0 && dueMs < 7 * 24 * 3600 * 1000
  }

  // Edit / Create handlers
  const handleOpenAddForm = () => {
    setEditingInstrument(null)
    setFormData(initialFormState)
    setActiveFormTab("general")
    setFormOpen(true)
  }

  const handleOpenEditForm = (it) => {
    setEditingInstrument(it)
    setFormData({
      ...initialFormState,
      ...it,
      productImages: Array.isArray(it.productImages) ? it.productImages.join(", ") : it.productImages || ""
    })
    setActiveFormTab("general")
    setFormOpen(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    // Format payload
    const payload = { ...formData }
    if (typeof payload.productImages === "string") {
      payload.productImages = payload.productImages
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
    }

    const url = editingInstrument 
      ? `/api/instruments/${editingInstrument.id}` 
      : "/api/instruments"
    const method = editingInstrument ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setFormOpen(false)
        loadAll()
      } else {
        alert("Failed to save instrument details.")
      }
    } catch (err) {
      console.error("Error saving instrument", err)
    }
  }

  // Delete handlers
  const promptDelete = (id) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/instruments/${deletingId}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteConfirmOpen(false)
        loadAll()
      } else {
        alert("Failed to delete instrument.")
      }
    } catch (err) {
      console.error("Error deleting instrument", err)
    }
  }

  // Render Form Subview
  if (formOpen) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setFormOpen(false)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {editingInstrument ? "Edit Instrument" : "Add Instrument"}
            </h1>
            <p className="text-muted-foreground">
              {editingInstrument ? `Updating details for ${editingInstrument.name}` : "Create a new instrument record."}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Form Section Navigation */}
            <div className="flex border-b mb-6 gap-2">
              {[
                { id: "general", label: "General Information" },
                { id: "specs", label: "Technical Specifications" },
                { id: "procedures", label: "Procedures & Docs" }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeFormTab === tab.id
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* General Tab */}
              {activeFormTab === "general" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Instrument Name *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g., Digital Oscilloscope" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" value={formData.category} onChange={handleInputChange} placeholder="e.g., Electronics" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="e.g., Keysight" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g., DSOX1204A" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serial">Serial Number *</Label>
                    <Input id="serial" name="serial" value={formData.serial} onChange={handleInputChange} required placeholder="e.g., MY59214732" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Storage Location</Label>
                    <Input id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Lab B - Shelf 2" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="productImages">Product Image URLs (comma-separated)</Label>
                    <Input id="productImages" name="productImages" value={formData.productImages} onChange={handleInputChange} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" />
                  </div>
                </div>
              )}

              {/* Specs Tab */}
              {activeFormTab === "specs" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="productOverview">Product Overview</Label>
                    <Textarea id="productOverview" name="productOverview" value={formData.productOverview} onChange={handleInputChange} placeholder="Provide a brief summary of the instrument's features and use cases..." className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="specifications">Specifications</Label>
                    <Textarea id="specifications" name="specifications" value={formData.specifications} onChange={handleInputChange} placeholder="Detail tech specs, inputs, frequency range, weight, dimensions..." className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parametersMeasured">Parameters Measured</Label>
                    <Input id="parametersMeasured" name="parametersMeasured" value={formData.parametersMeasured} onChange={handleInputChange} placeholder="Voltage, frequency, temperature..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accuracy">Accuracy</Label>
                    <Input id="accuracy" name="accuracy" value={formData.accuracy} onChange={handleInputChange} placeholder="e.g., ±0.05% + 1 digit" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurementRange">Measurement Range</Label>
                    <Input id="measurementRange" name="measurementRange" value={formData.measurementRange} onChange={handleInputChange} placeholder="e.g., 0V to 1000V" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resolution">Resolution</Label>
                    <Input id="resolution" name="resolution" value={formData.resolution} onChange={handleInputChange} placeholder="e.g., 0.1 mV" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="applications">Applications</Label>
                    <Textarea id="applications" name="applications" value={formData.applications} onChange={handleInputChange} placeholder="Where is this instrument typically used?" className="min-h-[80px]" />
                  </div>
                </div>
              )}

              {/* Procedures Tab */}
              {activeFormTab === "procedures" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="operatingProcedure">Operating Procedure</Label>
                    <Textarea id="operatingProcedure" name="operatingProcedure" value={formData.operatingProcedure} onChange={handleInputChange} placeholder="Step-by-step guidelines for operation..." className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="calibrationProcedure">Calibration Procedure</Label>
                    <Textarea id="calibrationProcedure" name="calibrationProcedure" value={formData.calibrationProcedure} onChange={handleInputChange} placeholder="Step-by-step calibration guidelines..." className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="safetyInstructions">Safety Instructions</Label>
                    <Textarea id="safetyInstructions" name="safetyInstructions" value={formData.safetyInstructions} onChange={handleInputChange} placeholder="Warnings, safety limits, shock precautions..." className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userManualUrl">User Manual URL (PDF)</Label>
                    <Input id="userManualUrl" name="userManualUrl" value={formData.userManualUrl} onChange={handleInputChange} placeholder="https://example.com/manual.pdf" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube Demo Video URL</Label>
                    <Input id="youtubeUrl" name="youtubeUrl" value={formData.youtubeUrl} onChange={handleInputChange} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                {activeFormTab === "general" && (
                  <Button type="button" onClick={() => setActiveFormTab("specs")}>Next</Button>
                )}
                {activeFormTab === "specs" && (
                  <Button type="button" onClick={() => setActiveFormTab("procedures")}>Next</Button>
                )}
                <Button type="submit" variant="default">
                  {editingInstrument ? "Save Changes" : "Create Instrument"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render Inventory Table
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage and track registered laboratory assets.</p>
        </div>
        <Button onClick={handleOpenAddForm} className="gap-2">
          <Plus className="w-4 h-4" /> Add Instrument
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">SNo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstruments.map((it, idx) => {
                  const urgent = isDueSoon(it.nextCalibrationDate)
                  return (
                    <TableRow 
                      key={it.id || idx}
                      className={urgent ? "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-950/20 dark:hover:bg-red-950/30" : ""}
                    >
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{it.name}</div>
                        {urgent && (
                          <div className="text-[10px] text-destructive font-semibold mt-0.5">
                            Calibration Due
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{it.brand || "—"}</TableCell>
                      <TableCell>{it.model || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{it.serial || "—"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={it.status === "available" ? "success" : "warning"}
                          className="capitalize"
                        >
                          {it.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEditForm(it)}
                          className="hover:text-primary"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => promptDelete(it.id)}
                          className="hover:text-destructive text-muted-foreground"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredInstruments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No matching instruments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the instrument and remove all booking associations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
