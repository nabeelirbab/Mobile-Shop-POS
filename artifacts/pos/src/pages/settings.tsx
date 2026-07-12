import React, { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetSettings, useUpdateSettings, useListUsers, useCreateUser, useDeleteUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, UserPlus, Save, Download, Upload, ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSettingsQueryKey, getListUsersQueryKey } from "@workspace/api-client-react";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: users, isLoading: usersLoading } = useListUsers();

  const updateSettings = useUpdateSettings();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  // Settings Form State
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("Rs");
  const [receiptSize, setReceiptSize] = useState<"58mm" | "80mm">("58mm");
  const [footerMsg, setFooterMsg] = useState("");
  const [logo, setLogo] = useState<string>("");

  React.useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name ?? "");
      setOwnerName((settings as any).owner_name ?? "");
      setAddress(settings.address ?? "");
      setPhone(settings.phone ?? "");
      setWhatsapp((settings as any).whatsapp ?? "");
      setEmail(settings.email ?? "");
      setCurrency(settings.currency ?? "Rs");
      setReceiptSize(settings.receipt_size as any ?? "58mm");
      setFooterMsg(settings.footer_message ?? "");
      setLogo((settings as any).logo ?? "");
    }
  }, [settings]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = () => {
    updateSettings.mutate({
      data: {
        store_name: storeName,
        address,
        phone,
        email,
        currency,
        receipt_size: receiptSize,
        footer_message: footerMsg,
        logo: logo || undefined,
        whatsapp: whatsapp || undefined,
        owner_name: ownerName || undefined,
      } as any
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to save", description: err.message, variant: "destructive" });
      }
    });
  };

  // User Management
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "cashier">("cashier");

  const handleCreateUser = () => {
    createUser.mutate({
      data: { username: newUsername, password: newPassword, name: newName, role: newRole }
    }, {
      onSuccess: () => {
        toast({ title: "User created" });
        setIsUserModalOpen(false);
        setNewUsername(""); setNewPassword(""); setNewName(""); setNewRole("cashier");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error creating user", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDeleteUser = (id: number) => {
    if (id === user?.id) { toast({ title: "Cannot delete yourself", variant: "destructive" }); return; }
    if (confirm("Delete this user?")) {
      deleteUser.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "User deleted" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }
      });
    }
  };

  const handleBackupExport = async () => {
    try {
      const resp = await fetch("/api/backup/export", { headers: { Authorization: `Bearer ${localStorage.getItem("pos_token")}` } });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `pos-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded" });
    } catch { toast({ title: "Backup failed", variant: "destructive" }); }
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        await fetch("/api/backup/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("pos_token")}` },
          body: JSON.stringify(data)
        });
        toast({ title: "Backup imported. Please refresh." });
      } catch { toast({ title: "Import failed", variant: "destructive" }); }
    };
    reader.readAsText(file);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

        <Tabs defaultValue="store" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="store">Store Details</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="data">Data & Backup</TabsTrigger>
          </TabsList>

          {/* STORE DETAILS */}
          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>These details appear on receipts and reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? <p>Loading...</p> : (
                  <>
                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Store Logo (appears on receipts)</label>
                      <div className="flex items-center gap-4">
                        {logo ? (
                          <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            <img
                              src={logo.startsWith("data:") || logo.startsWith("http") ? logo : logo}
                              alt="Store Logo"
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => setLogo("")}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Upload</span>
                          </div>
                        )}
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Recommended: Square image (PNG/JPG)</p>
                          <p>Max size: 2MB</p>
                          <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                            <Upload className="w-3 h-3 mr-1" /> {logo ? "Change Logo" : "Upload Logo"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Store Name</label>
                        <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Umair Mobile Gallery UMG" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Owner Name</label>
                        <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Owner Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03349999602" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">WhatsApp</label>
                        <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="03349999602" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Address</label>
                        <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street no 1 Mor Sambrial" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="shop@email.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Currency Symbol</label>
                        <Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Rs" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Receipt Paper Size</label>
                        <Select value={receiptSize} onValueChange={(v: any) => setReceiptSize(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58mm">58mm (Small Thermal)</SelectItem>
                            <SelectItem value="80mm">80mm (Large Thermal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Receipt Footer Message</label>
                        <Input value={footerMsg} onChange={e => setFooterMsg(e.target.value)} placeholder="Thank You For Shopping! Visit Again." />
                      </div>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                      <Save className="w-4 h-4 mr-2" /> {updateSettings.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* USER MANAGEMENT */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>System Users</CardTitle>
                  <CardDescription>Manage who can access the POS system.</CardDescription>
                </div>
                <Button onClick={() => setIsUserModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : users?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono font-medium">{u.username}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.id}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g. ali_cashier" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ali Hassan" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cashier">Cashier (POS + Sales)</SelectItem>
                        <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={createUser.isPending || !newUsername || !newPassword || !newName}>
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* DATA & BACKUP */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Backup</CardTitle>
                <CardDescription>Export or restore your complete database.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleBackupExport}>
                    <Download className="w-4 h-4 mr-2" /> Download Backup (JSON)
                  </Button>
                  <div>
                    <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleBackupImport} />
                    <Button variant="outline" onClick={() => document.getElementById("import-file")?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Restore from Backup
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Backup includes all products, sales, customers, suppliers, expenses, and settings.
                  Restoring will overwrite all current data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
