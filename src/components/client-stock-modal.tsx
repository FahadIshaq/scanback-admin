"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import adminApiClient from "@/lib/api"
import { Loader2, Package, CheckCircle, XCircle, List, ChevronDown, ChevronRight, Calendar, Hash } from "lucide-react"
import { ClientQRCodesList } from "@/components/client-qr-codes-list"
import { getTypeConfig, getTypeLabel } from "@/lib/qr-type-utils"

interface Client {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
}

interface ClientStockModalProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientStockModal({ client, open, onOpenChange }: ClientStockModalProps) {
  const [loading, setLoading] = useState(false)
  const [stockData, setStockData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && client) {
      loadStockBalance()
    } else {
      setStockData(null)
      setError(null)
    }
  }, [open, client])

  const loadStockBalance = async () => {
    if (!client) return

    try {
      setLoading(true)
      setError(null)
      const response = await adminApiClient.getClientStockBalance(client._id)
      if (response.success) {
        setStockData(response.data)
      } else {
        setError(response.message || "Failed to load stock balance")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load stock balance")
    } finally {
      setLoading(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Stock Balance: {client.name}</DialogTitle>
          <DialogDescription>
            View stock allocation, activation status, and manage QR codes for this client
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        ) : stockData ? (
          <Tabs defaultValue="batches" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="batches">
                <Package className="h-4 w-4 mr-2" />
                Batches ({stockData.batches?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="summary">
                <Package className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="codes">
                <List className="h-4 w-4 mr-2" />
                All QR Codes ({stockData.qrCodes?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="batches" className="space-y-4 mt-6">
              {stockData.batches && stockData.batches.length > 0 ? (
                <div className="space-y-3">
                  {stockData.batches.map((batch: any) => {
                    const isExpanded = expandedBatches.has(batch._id)
                    const activatedCount = batch.qrCodes?.filter((qr: any) => qr.isActivated).length || 0
                    const totalCount = batch.qrCodes?.length || batch.quantity || 0
                    
                    return (
                      <Card key={batch._id} className="overflow-hidden">
                        <CardHeader 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            const newExpanded = new Set(expandedBatches)
                            if (isExpanded) {
                              newExpanded.delete(batch._id)
                            } else {
                              newExpanded.add(batch._id)
                            }
                            setExpandedBatches(newExpanded)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-lg">
                                    {batch.quantity} QR Code{batch.quantity !== 1 ? 's' : ''} Generated
                                  </CardTitle>
                                  <Badge variant={batch.mode === 'connected' ? 'default' : 'secondary'}>
                                    {batch.mode === 'connected' ? 'Connected' : 'Unique'}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getTypeLabel(batch.type)}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(batch.createdAt).toLocaleString()}
                                  </div>
                                  {batch.batchId && (
                                    <div className="flex items-center gap-1">
                                      <Hash className="h-4 w-4" />
                                      {batch.batchId}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    {activatedCount} / {totalCount} activated
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && batch.qrCodes && batch.qrCodes.length > 0 && (
                          <CardContent className="pt-0 border-t">
                            <div className="mt-4">
                              <h4 className="font-semibold mb-3 text-sm text-gray-700">
                                QR Codes in this batch ({batch.qrCodes.length}):
                              </h4>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {batch.qrCodes.map((qr: any) => (
                                  <div
                                    key={qr._id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="font-mono text-sm">{qr.code}</div>
                                      <Badge
                                        variant={qr.isActivated ? 'default' : 'outline'}
                                        className={qr.isActivated ? 'bg-green-600' : ''}
                                      >
                                        {qr.isActivated ? 'Activated' : 'Not Activated'}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {getTypeLabel(qr.type)}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(qr.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No batches found for this client</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="summary" className="space-y-6 mt-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stockData.summary.total}</div>
                      <div className="text-sm text-gray-600">Total Stock</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stockData.summary.activated}</div>
                      <div className="text-sm text-gray-600">Activated</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{stockData.summary.remaining}</div>
                      <div className="text-sm text-gray-600">Remaining</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stockData.stock).map(([type, stats]: [string, any]) => (
                      <div key={type} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const config = getTypeConfig(type)
                              const Icon = config.icon
                              return (
                                <span className={`p-1.5 rounded-md ${config.bgColor}`}>
                                  <Icon className={`h-4 w-4 ${config.iconColor}`} />
                                </span>
                              )
                            })()}
                            <h3 className="font-semibold text-lg">{getTypeLabel(type)}</h3>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="text-xl font-bold">{stats.total}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Activated
                            </div>
                            <div className="text-xl font-bold text-green-600">{stats.activated}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-orange-600" />
                              Remaining
                            </div>
                            <div className="text-xl font-bold text-orange-600">{stats.remaining}</div>
                          </div>
                        </div>
                        {stats.total > 0 && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(stats.activated / stats.total) * 100}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {((stats.activated / stats.total) * 100).toFixed(1)}% activated
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {Object.keys(stockData.stock).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No stock allocated to this client yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="codes" className="mt-6">
              {stockData.qrCodes && stockData.qrCodes.length > 0 ? (
                <ClientQRCodesList 
                  qrCodes={stockData.qrCodes} 
                  onQRCodeUpdated={loadStockBalance}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No QR codes assigned to this client yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

