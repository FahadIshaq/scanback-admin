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
import adminApiClient from "@/lib/api"
import { Loader2, Package, CheckCircle, XCircle, List } from "lucide-react"
import { SupplierQRCodesList } from "@/components/supplier-qr-codes-list"

interface Supplier {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
}

interface SupplierStockModalProps {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupplierStockModal({ supplier, open, onOpenChange }: SupplierStockModalProps) {
  const [loading, setLoading] = useState(false)
  const [stockData, setStockData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && supplier) {
      loadStockBalance()
    } else {
      setStockData(null)
      setError(null)
    }
  }, [open, supplier])

  const loadStockBalance = async () => {
    if (!supplier) return

    try {
      setLoading(true)
      setError(null)
      const response = await adminApiClient.getSupplierStockBalance(supplier._id)
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

  if (!supplier) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Stock Balance: {supplier.name}</DialogTitle>
          <DialogDescription>
            View stock allocation, activation status, and manage QR codes for this supplier
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
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">
                <Package className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="codes">
                <List className="h-4 w-4 mr-2" />
                QR Codes ({stockData.qrCodes?.length || 0})
              </TabsTrigger>
            </TabsList>
            
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
                          <h3 className="font-semibold capitalize text-lg">{type}</h3>
                          <Package className="h-5 w-5 text-gray-400" />
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
                        No stock allocated to this supplier yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="codes" className="mt-6">
              {stockData.qrCodes && stockData.qrCodes.length > 0 ? (
                <SupplierQRCodesList 
                  qrCodes={stockData.qrCodes} 
                  onQRCodeUpdated={loadStockBalance}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No QR codes assigned to this supplier yet</p>
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

