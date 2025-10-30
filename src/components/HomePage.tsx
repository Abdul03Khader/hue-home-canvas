import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload, Brush, Palette, Download } from "lucide-react";
import heroHouse from "@/assets/hero-house.jpg";
import featureUpload from "@/assets/feature-upload.png";
import featureSelect from "@/assets/feature-select.png";
import featureColors from "@/assets/feature-colors.png";
import featureSave from "@/assets/feature-save.png";

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
            Home Visualizer Pro
          </h1>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Login
            </Button>
            <Button variant="hero" onClick={() => navigate("/auth")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Visualize Your Dream Home{" "}
                <span className="gradient-primary bg-clip-text text-transparent">
                  Before You Paint
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Upload your home image, select areas, and try thousands of real paint colors instantly. 
                No guesswork, just perfect color choices.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="hero" size="xl" onClick={() => navigate("/editor")}>
                  Start Visualizing
                </Button>
                <Button variant="glow" size="xl" onClick={() => navigate("/auth")}>
                  Sign Up Free
                </Button>
              </div>
            </div>
            
            <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl animate-glow-pulse">
                <img 
                  src={heroHouse} 
                  alt="Beautiful modern house exterior ready for paint visualization" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your home visualization in four simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: featureUpload,
                title: "Upload Your Photo",
                description: "Upload an image of your house exterior or interior wall",
                delay: "0s"
              },
              {
                icon: featureSelect,
                title: "Select Areas",
                description: "Use polygon tool to precisely select walls and surfaces",
                delay: "0.1s"
              },
              {
                icon: featureColors,
                title: "Try Real Colors",
                description: "Browse thousands of paint colors from top brands",
                delay: "0.2s"
              },
              {
                icon: featureSave,
                title: "Save & Download",
                description: "Save your designs and download high-quality images",
                delay: "0.3s"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-smooth hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: feature.delay }}
              >
                <div className="w-20 h-20 mb-6 mx-auto">
                  <img src={feature.icon} alt={feature.title} className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">{feature.title}</h3>
                <p className="text-muted-foreground text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-bold">Why Choose Home Visualizer Pro?</h2>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {[
                { title: "Realistic Preview", description: "See exactly how colors will look on your walls" },
                { title: "Save Time & Money", description: "Avoid costly painting mistakes and repaints" },
                { title: "Brand Colors", description: "Access real paint shades from Asian Paints, Dulux & more" }
              ].map((benefit, index) => (
                <div key={index} className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah Johnson", text: "This tool saved me from making a huge mistake! I could visualize different colors before committing.", rating: 5 },
              { name: "Michael Chen", text: "The polygon selection is incredibly precise. Perfect for complex walls and trim work.", rating: 5 },
              { name: "Emma Davis", text: "Love the real brand colors! I found my perfect shade and ordered the exact paint.", rating: 5 }
            ].map((testimonial, index) => (
              <div key={index} className="bg-card rounded-xl p-6 shadow-lg">
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-primary text-xl">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                <p className="font-semibold">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Home?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Start visualizing your dream colors today. No credit card required.
          </p>
          <Button 
            variant="glass" 
            size="xl" 
            className="text-white border-2 border-white hover:bg-white hover:text-primary"
            onClick={() => navigate("/editor")}
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4 gradient-primary bg-clip-text text-transparent">
                Home Visualizer Pro
              </h3>
              <p className="text-sm text-muted-foreground">
                AI-powered paint visualization for homeowners and professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-smooth">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-smooth">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-smooth">Examples</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-smooth">About</a></li>
                <li><a href="#" className="hover:text-primary transition-smooth">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-smooth">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-smooth">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-smooth">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-smooth">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Home Visualizer Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
