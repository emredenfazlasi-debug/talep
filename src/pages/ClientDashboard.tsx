import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, LogOut, FileText, Clock, CheckCircle, Send, User, Briefcase, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Request = Database["public"]["Tables"]["requests"]["Row"];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Beklemede", color: "bg-warning/15 text-warning border-warning/30", icon: <Clock className="w-3.5 h-3.5" /> },
  assigned: { label: "Atandı", color: "bg-primary/15 text-primary border-primary/30", icon: <User className="w-3.5 h-3.5" /> },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: <Briefcase className="w-3.5 h-3.5" /> },
  completed: { label: "Tamamlandı", color: "bg-success/15 text-success border-success/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  delivered: { label: "Teslim Edildi", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30", icon: <Send className="w-3.5 h-3.5" /> },
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMeta, setUserMeta] = useState({ fullName: "", companyName: "" });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    setUserMeta({
      fullName: user.user_metadata?.full_name || "",
      companyName: user.user_metadata?.company_name || "",
    });

    // Sadece bu kullanıcının taleplerini getir
    const { data } = await supabase
      .from("requests")
      .select("*")
      .eq("client_user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
    setLoading(false);

    // Gerçek zamanlı güncelleme
    supabase
      .channel("my-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `client_user_id=eq.${user.id}` }, () => init())
      .subscribe();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Taleplerim</h1>
            <p className="text-xs text-muted-foreground">
              {userMeta.companyName && <span className="text-primary">{userMeta.companyName} · </span>}
              {userMeta.fullName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => navigate("/request")}>
              <Plus className="w-4 h-4 mr-1" /> Yeni Talep
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Özet */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(statusConfig).map(([key, config]) => {
            const count = requests.filter((r) => r.status === key).length;
            return (
              <div key={key} className="glass-card rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {config.icon}
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </div>
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </div>

        {/* Talepler */}
        {requests.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-4">Henüz talebiniz bulunmuyor</p>
            <Button onClick={() => navigate("/request")}>
              <Plus className="w-4 h-4 mr-1" /> İlk Talebinizi Oluşturun
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const status = statusConfig[req.status] || statusConfig.pending;
              return (
                <div key={req.id} className="glass-card rounded-xl p-6 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{req.brand_name}</h3>
                        <Badge variant="outline" className={status.color + " text-xs"}>
                          <span className="flex items-center gap-1">{status.icon} {status.label}</span>
                        </Badge>
                        {req.ai_category && (
                          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                            {req.ai_category.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(req.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                        {req.requested_deadline && (
                          <> · <span className="text-warning">Son teslim: {new Date(req.requested_deadline).toLocaleDateString("tr-TR")}</span></>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{req.brief}</p>
                    </div>
                  </div>

                  {/* Teslim edilmişse dosyaları göster */}
                  {req.status === "delivered" && req.delivery_urls && req.delivery_urls.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-success flex items-center gap-1 mb-2">
                        <CheckCircle className="w-3 h-3" /> Tasarımınız hazır! İndirebilirsiniz.
                      </p>
                      {req.delivery_note && (
                        <p className="text-xs text-muted-foreground mb-2 italic">"{req.delivery_note}"</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {req.delivery_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 hover:bg-primary/20 transition-colors"
                          >
                            <Download className="w-3 h-3" /> Dosya {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
