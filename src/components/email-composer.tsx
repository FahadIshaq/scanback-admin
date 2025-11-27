"use client"

import { useState, useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Mail, X, Loader2, CheckCircle, XCircle, Users, Package, Plus, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon, FileSignature, Trash2, Paperclip } from "lucide-react"
import adminApiClient from "@/lib/api"

interface User {
  _id: string
  name: string
  email: string
}

interface Client {
  _id: string
  name: string
  email?: string
}

interface EmailSignature {
  id: string
  name: string
  content: string
  createdAt: string
}

const SIGNATURES_STORAGE_KEY = 'email_signatures'

export function EmailComposer() {
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [customEmails, setCustomEmails] = useState<string[]>([])
  const [newCustomEmail, setNewCustomEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; errors: Array<{ email: string; error: string }> } | null>(null)
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [selectedSignature, setSelectedSignature] = useState<string>("")
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [newSignatureName, setNewSignatureName] = useState("")
  const [newSignatureContent, setNewSignatureContent] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ filename: string; url: string }>>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => {
      setHtmlContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  useEffect(() => {
    loadUsers()
    loadClients()
    loadSignatures()
  }, [])

  const loadSignatures = () => {
    try {
      const stored = localStorage.getItem(SIGNATURES_STORAGE_KEY)
      if (stored) {
        setSignatures(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load signatures:", error)
    }
  }

  const saveSignatures = (newSignatures: EmailSignature[]) => {
    try {
      localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(newSignatures))
      setSignatures(newSignatures)
    } catch (error) {
      console.error("Failed to save signatures:", error)
    }
  }

  const addSignature = () => {
    if (!newSignatureName.trim() || !newSignatureContent.trim()) {
      alert("Please enter both name and content for the signature")
      return
    }

    const newSignature: EmailSignature = {
      id: Date.now().toString(),
      name: newSignatureName.trim(),
      content: newSignatureContent.trim(),
      createdAt: new Date().toISOString(),
    }

    const updated = [...signatures, newSignature]
    saveSignatures(updated)
    setNewSignatureName("")
    setNewSignatureContent("")
    setSignatureModalOpen(false)
  }

  const deleteSignature = (id: string) => {
    if (!confirm("Are you sure you want to delete this signature?")) return
    const updated = signatures.filter(s => s.id !== id)
    saveSignatures(updated)
    if (selectedSignature === id) {
      setSelectedSignature("")
    }
  }

  const insertSignature = () => {
    if (!selectedSignature) return
    const signature = signatures.find(s => s.id === selectedSignature)
    if (signature && editor) {
      editor.chain().focus().insertContent(`<br><br>${signature.content}`).run()
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    try {
      setUploadingImage(true)
      const response = await adminApiClient.uploadImage(file, 'email-images')
      if (response.success && response.url && editor) {
        editor.chain().focus().setImage({ src: response.url }).run()
      } else {
        alert(response.message || "Failed to upload image")
      }
    } catch (error: any) {
      console.error("Image upload failed:", error)
      alert(error.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB")
      return
    }

    try {
      setUploadingAttachment(true)
      const response = await adminApiClient.uploadFile(file, 'email-attachments')
      if (response.success && response.url && response.filename) {
        setAttachments([...attachments, { filename: response.filename || file.name, url: response.url }])
      } else {
        alert(response.message || "Failed to upload file")
      }
    } catch (error: any) {
      console.error("File upload failed:", error)
      alert(error.message || "Failed to upload file")
    } finally {
      setUploadingAttachment(false)
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  // Sync editor content when htmlContent changes externally
  useEffect(() => {
    if (editor && htmlContent !== editor.getHTML()) {
      editor.commands.setContent(htmlContent)
    }
  }, [htmlContent, editor])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await adminApiClient.getAllUsers({ page: 1, limit: 1000 })
      if (response.success && response.data.users) {
        setUsers(response.data.users)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadClients = async () => {
    try {
      setLoadingClients(true)
      const response = await adminApiClient.getAllClients()
      if (response.success && response.data.clients) {
        setClients(response.data.clients)
      }
    } catch (error) {
      console.error("Failed to load clients:", error)
    } finally {
      setLoadingClients(false)
    }
  }

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds)
    if (newSet.has(userId)) {
      newSet.delete(userId)
    } else {
      newSet.add(userId)
    }
    setSelectedUserIds(newSet)
  }

  const toggleClient = (clientId: string) => {
    const newSet = new Set(selectedClientIds)
    if (newSet.has(clientId)) {
      newSet.delete(clientId)
    } else {
      newSet.add(clientId)
    }
    setSelectedClientIds(newSet)
  }

  const toggleAllUsers = () => {
    if (selectedUserIds.size === users.length) {
      // Deselect all
      setSelectedUserIds(new Set())
    } else {
      // Select all
      setSelectedUserIds(new Set(users.map(u => u._id)))
    }
  }

  const toggleAllClients = () => {
    const clientsWithEmail = clients.filter(c => c.email)
    const allSelected = clientsWithEmail.every(c => selectedClientIds.has(c._id))
    
    if (allSelected && clientsWithEmail.length > 0) {
      // Deselect all
      setSelectedClientIds(new Set())
    } else {
      // Select all clients with email
      setSelectedClientIds(new Set(clientsWithEmail.map(c => c._id)))
    }
  }

  const addCustomEmail = () => {
    const email = newCustomEmail.trim()
    if (email && email.includes("@") && !customEmails.includes(email)) {
      setCustomEmails([...customEmails, email])
      setNewCustomEmail("")
    }
  }

  const removeCustomEmail = (email: string) => {
    setCustomEmails(customEmails.filter(e => e !== email))
  }

  const handleSend = async () => {
    if (!subject.trim()) {
      alert("Please enter a subject")
      return
    }

    if (!htmlContent.trim()) {
      alert("Please enter email content")
      return
    }

    const totalRecipients = selectedUserIds.size + selectedClientIds.size + customEmails.length
    if (totalRecipients === 0) {
      alert("Please select at least one recipient (user, client, or custom email)")
      return
    }

    if (!confirm(`Send email to ${totalRecipients} recipient(s)?`)) {
      return
    }

    try {
      setSending(true)
      setResult(null)

      // Filter clients that have email addresses
      const clientsWithEmail = clients.filter(c => c.email && selectedClientIds.has(c._id))
      const validClientIds = clientsWithEmail.map(c => c._id)

      const response = await adminApiClient.sendBulkEmail({
        userIds: Array.from(selectedUserIds),
        clientIds: validClientIds,
        customEmails: customEmails.length > 0 ? customEmails : undefined,
        subject: subject.trim(),
        htmlContent: htmlContent.trim(),
        textContent: htmlContent.replace(/<[^>]*>/g, '').trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      if (response.success) {
        setResult(response.data)
        // Reset form
        setSubject("")
        setHtmlContent("")
        editor?.commands.clearContent()
        setSelectedUserIds(new Set())
        setSelectedClientIds(new Set())
        setCustomEmails([])
        setAttachments([])
      } else {
        alert(response.message || "Failed to send email")
      }
    } catch (error: any) {
      console.error("Failed to send email:", error)
      alert(error.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  const totalRecipients = selectedUserIds.size + 
    clients.filter(c => c.email && selectedClientIds.has(c._id)).length + 
    customEmails.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </CardTitle>
          <CardDescription>
            Send emails to users, clients, or custom email addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipients Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Recipients</Label>

            {/* Users Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Users</Label>
                  {selectedUserIds.size > 0 && (
                    <Badge variant="secondary">{selectedUserIds.size} selected</Badge>
                  )}
                </div>
                {users.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllUsers}
                    className="text-xs h-7"
                  >
                    {selectedUserIds.size === users.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500">No users found</p>
                  ) : (
                    users.map((user) => (
                      <div key={user._id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedUserIds.has(user._id)}
                          onCheckedChange={() => toggleUser(user._id)}
                        />
                        <Label className="flex-1 text-sm cursor-pointer">
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Clients Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Clients</Label>
                  {selectedClientIds.size > 0 && (
                    <Badge variant="secondary">{selectedClientIds.size} selected</Badge>
                  )}
                </div>
                {clients.filter(c => c.email).length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllClients}
                    className="text-xs h-7"
                  >
                    {clients.filter(c => c.email).every(c => selectedClientIds.has(c._id)) 
                      ? 'Deselect All' 
                      : 'Select All'}
                  </Button>
                )}
              </div>
              {loadingClients ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading clients...
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500">No clients found</p>
                  ) : (
                    clients.map((client) => (
                      <div key={client._id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedClientIds.has(client._id)}
                          onCheckedChange={() => toggleClient(client._id)}
                          disabled={!client.email}
                        />
                        <Label className={`flex-1 text-sm ${client.email ? 'cursor-pointer' : 'text-gray-400'}`}>
                          {client.name} {client.email ? `(${client.email})` : '(no email)'}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Custom Emails */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Email Addresses</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newCustomEmail}
                  onChange={(e) => setNewCustomEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomEmail()
                    }
                  }}
                />
                <Button type="button" onClick={addCustomEmail} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {customEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customEmails.map((email) => (
                    <Badge key={email} variant="outline" className="flex items-center gap-1">
                      {email}
                      <button
                        onClick={() => removeCustomEmail(email)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 pt-2 border-t">
              Total recipients: <strong>{totalRecipients}</strong>
            </div>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Signature Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Signature</Label>
                <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <FileSignature className="h-4 w-4 mr-2" />
                      Manage Signatures
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Manage Email Signatures</DialogTitle>
                      <DialogDescription>
                        Create and manage email signatures to quickly insert into your emails
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Existing Signatures */}
                      {signatures.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Existing Signatures</Label>
                          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                            {signatures.map((sig) => (
                              <div key={sig.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border">
                                <div className="flex-1">
                                  <div className="font-medium text-sm mb-1">{sig.name}</div>
                                  <div 
                                    className="text-xs text-gray-600"
                                    dangerouslySetInnerHTML={{ __html: sig.content }}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSignature(sig.id)}
                                  className="ml-2 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add New Signature */}
                      <div className="space-y-3 border-t pt-4">
                        <Label className="text-sm font-semibold">Add New Signature</Label>
                        <div className="space-y-2">
                          <Label htmlFor="sig-name" className="text-xs">Signature Name *</Label>
                          <Input
                            id="sig-name"
                            placeholder="e.g., Company Signature, Personal Signature"
                            value={newSignatureName}
                            onChange={(e) => setNewSignatureName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sig-content" className="text-xs">Signature Content (HTML) *</Label>
                          <Textarea
                            id="sig-content"
                            placeholder="Enter signature HTML content (e.g., &lt;p&gt;Best regards,&lt;/p&gt;&lt;p&gt;Your Name&lt;/p&gt;)"
                            value={newSignatureContent}
                            onChange={(e) => setNewSignatureContent(e.target.value)}
                            rows={6}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500">
                            You can use HTML tags for formatting. The signature will be inserted at the cursor position.
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={addSignature}
                          disabled={!newSignatureName.trim() || !newSignatureContent.trim()}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Signature
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {signatures.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedSignature || "none"} onValueChange={(value) => setSelectedSignature(value === "none" ? "" : value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a signature to insert" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No signature</SelectItem>
                      {signatures.map((sig) => (
                        <SelectItem key={sig.id} value={sig.id}>
                          {sig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={insertSignature}
                    disabled={!selectedSignature}
                  >
                    Insert Signature
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Email Content *</Label>
              <div className="border rounded-lg overflow-hidden bg-white">
                {/* Toolbar */}
                {editor && (
                  <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className="h-8 px-2 text-xs"
                    >
                      H1
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className="h-8 px-2 text-xs"
                    >
                      H2
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      className="h-8 px-2 text-xs"
                    >
                      H3
                    </Button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <Button
                      type="button"
                      variant={editor.isActive('bold') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className="h-8 px-2"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive('italic') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className="h-8 px-2"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive('strike') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className="h-8 px-2"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <Button
                      type="button"
                      variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className="h-8 px-2"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className="h-8 px-2"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <Button
                      type="button"
                      variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      className="h-8 px-2"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      className="h-8 px-2"
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      className="h-8 px-2"
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <Button
                      type="button"
                      variant={editor.isActive('link') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        const url = window.prompt('Enter URL:')
                        if (url) {
                          editor.chain().focus().setLink({ href: url }).run()
                        }
                      }}
                      className="h-8 px-2"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                      disabled={!editor.isActive('link')}
                      className="h-8 px-2"
                    >
                      Unlink
                    </Button>
                    <div className="flex-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                      className="h-8 px-2 text-xs"
                    >
                      Clear
                    </Button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(file)
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="h-8 px-2"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                {/* Editor Content */}
                <div className="min-h-[300px] p-4">
                  <style jsx global>{`
                    .ProseMirror {
                      outline: none;
                      min-height: 300px;
                    }
                    .ProseMirror p.is-editor-empty:first-child::before {
                      color: #9ca3af;
                      content: attr(data-placeholder);
                      float: left;
                      height: 0;
                      pointer-events: none;
                    }
                    .ProseMirror h1 {
                      font-size: 2em;
                      font-weight: bold;
                      margin: 0.67em 0;
                    }
                    .ProseMirror h2 {
                      font-size: 1.5em;
                      font-weight: bold;
                      margin: 0.75em 0;
                    }
                    .ProseMirror h3 {
                      font-size: 1.17em;
                      font-weight: bold;
                      margin: 0.83em 0;
                    }
                    .ProseMirror ul, .ProseMirror ol {
                      padding-left: 1.5em;
                      margin: 1em 0;
                    }
                    .ProseMirror a {
                      color: #2563eb;
                      text-decoration: underline;
                    }
                    .ProseMirror img {
                      max-width: 100%;
                      height: auto;
                      border-radius: 0.5rem;
                      margin: 1em 0;
                    }
                    .ProseMirror img.ProseMirror-selectednode {
                      outline: 2px solid #2563eb;
                    }
                  `}</style>
                  <EditorContent editor={editor} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Use the formatting toolbar to style your email. The content will be sent as HTML.
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={attachmentInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleAttachmentUpload(file)
                    }
                  }}
                  className="hidden"
                  multiple
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="flex items-center gap-2"
                >
                  {uploadingAttachment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4" />
                      Add Attachment
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">Max 10MB per file. Any file format supported.</p>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{att.filename}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="text-red-600 hover:text-red-700 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={sending || totalRecipients === 0 || !subject.trim() || !htmlContent.trim()}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email to {totalRecipients} Recipient{totalRecipients !== 1 ? 's' : ''}
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${
              result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-yellow-600" />
                )}
                <strong className={result.failed === 0 ? 'text-green-800' : 'text-yellow-800'}>
                  {result.failed === 0 ? 'All emails sent successfully!' : 'Some emails failed to send'}
                </strong>
              </div>
              <div className="text-sm space-y-1">
                <p>Total recipients: {result.success + result.failed}</p>
                <p className="text-green-700">Successfully sent: {result.success}</p>
                {result.failed > 0 && (
                  <>
                    <p className="text-red-700">Failed: {result.failed}</p>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {result.errors.map((error, index) => (
                            <li key={index} className="text-xs">
                              {error.email}: {error.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

