import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Layers, Brain, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Destekli İş Yönetimi</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Talepleri <span className="text-gradient">Akıllıca</span>
            <br />
            Yönlendirin
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Müşteri taleplerini yapay zeka ile analiz edin, doğru tasarımcıya otomatik atayın ve teslimatları tek panelden yönetin.
          </p>

          <div className="flex items-center gap-4 justify-center">
            <Link to="/request">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Talep Oluştur
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold">
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {[
              {
                icon: <Brain className="w-6 h-6 text-primary" />,
                title: "AI Yönlendirme",
                desc: "Talepler otomatik olarak doğru tasarımcıya yönlendirilir",
              },
              {
                icon: <Layers className="w-6 h-6 text-primary" />,
                title: "Proje Hafızası",
                desc: "Aynı projenin talepleri aynı tasarımcıya gider",
              },
              {
                icon: <Zap className="w-6 h-6 text-primary" />,
                title: "Anlık Teslimat",
                desc: "Tasarımlar hazır olduğunda müşteriye anında iletilir",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-6 text-left"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
