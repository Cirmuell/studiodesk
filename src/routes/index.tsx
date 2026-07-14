import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "StudioDesk | The Dynamic Architect for Creatives" },
      { name: "description", content: "AI pricing, proposals and invoices for independent creatives." },
    ],
  }),
  component: LandingPage,
});

// We keep the shader canvas logic cleanly inside a React component
function BackgroundShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = `
        attribute vec2 position;
        varying vec2 v_texCoord;
        void main() {
            v_texCoord = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fs = `
        precision highp float;
        varying vec2 v_texCoord;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        void main() {
            vec2 uv = v_texCoord;
            vec2 mouse = u_mouse / u_resolution;
            
            float noise = sin(uv.x * 10.0 + u_time * 0.5) * 0.1;
            noise += cos(uv.y * 8.0 - u_time * 0.3) * 0.1;
            
            // StudioDesk Brand Palette adapted for the shader
            vec3 color1 = vec3(0.23, 0.14, 0.10); // Ink Deep
            vec3 color2 = vec3(0.98, 0.98, 0.96); // Paper Cream
            vec3 color3 = vec3(0.85, 0.45, 0.33); // Terra Cotta

            float mixer = smoothstep(0.3, 0.7, uv.x + noise + (mouse.x - 0.5) * 0.2);
            vec3 color = mix(color1, color2, mixer);
            color = mix(color, color3, sin(u_time * 0.2) * 0.05);

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const program = gl.createProgram();
    if (!program) return;
    
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vs);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const mouseLoc = gl.getUniformLocation(program, "u_mouse");

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    let animationFrameId: number;
    function render(time: number) {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.uniform1f(timeLoc, time * 0.001);
      gl!.uniform2f(resLoc, canvas.width, canvas.height);
      gl!.uniform2f(mouseLoc, mouseX, mouseY);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    }
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none opacity-40"
    />
  );
}

function Hero3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xd96b52, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const group = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const material = new THREE.MeshPhongMaterial({
        color: 0x3b241a,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      );
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(mesh);
    }
    scene.add(group);

    camera.position.z = 6;

    let mX = 0, mY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mX = e.clientX / window.innerWidth - 0.5;
      mY = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMouseMove);

    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);
      group.rotation.y += 0.003;
      group.rotation.x += 0.001;
      group.position.x += (mX * 2 - group.position.x) * 0.05;
      group.position.y += (-mY * 2 - group.position.y) * 0.05;
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" style={{ animation: "float 4s ease-in-out infinite" }} />;
}

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    // Reveal animations for hero section
    gsap.fromTo(
      ".hero-reveal",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out", delay: 0.2 }
    );

    // Scroll reveal animations
    const revealElements = gsap.utils.toArray(".scroll-reveal");
    revealElements.forEach((el: any) => {
      gsap.fromTo(
        el,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="bg-[#FAF8F3] text-[#3B241A] min-h-screen overflow-x-hidden font-sans">
      <BackgroundShader />
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* Top NavBar */}
      <nav className="fixed top-0 w-full bg-[#FAF8F3]/40 border-b border-[#3B241A]/10 backdrop-blur-xl z-50 transition-all h-20">
        <div className="flex justify-between items-center px-6 md:px-16 h-full max-w-7xl mx-auto">
          <div className="font-serif text-2xl font-bold tracking-tighter">
            StudioDesk
          </div>
          <div className="hidden md:flex items-center gap-12 font-medium text-sm">
            <a className="text-[#D96B52] relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-[#D96B52]" href="#product">Product</a>
            <a className="text-[#504440] hover:text-[#D96B52] transition-colors" href="#features">Features</a>
            <a className="text-[#504440] hover:text-[#D96B52] transition-colors" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-sm font-medium">
            <Link to="/auth" className="hover:text-[#D96B52] transition-colors">Sign In</Link>
            <Link to="/onboarding" className="bg-[#3B241A] text-[#FAF8F3] px-6 py-2.5 shadow-xl hover:bg-opacity-90 transition-all rounded-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 w-full">
            <div className="lg:col-span-8 py-16">
              <span className="hero-reveal inline-block px-4 py-1.5 bg-[#D96B52] text-[#FAF8F3] text-xs font-semibold uppercase tracking-[0.2em] mb-10 shadow-lg rounded-sm">
                Architecting Tomorrow
              </span>
              <h1 className="hero-reveal font-serif text-5xl md:text-7xl lg:text-[80px] font-bold mb-10 leading-[0.95] tracking-tight">
                Your Creative <br />
                <span className="italic text-[#D96B52]">Business</span>, <br />
                <span className="relative">
                  Powered by AI.
                  <svg className="absolute -bottom-4 left-0 w-full h-2 text-[#D96B52]/20" fill="currentColor" viewBox="0 0 400 20">
                    <path d="M0 10 Q 100 0 200 10 T 400 10" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  </svg>
                </span>
              </h1>
              <p className="hero-reveal text-lg md:text-xl text-[#504440] max-w-2xl mb-14 leading-relaxed">
                A high-fidelity environment for independent creatives to design proposals, generate invoices, and scale <span className="text-[#D96B52] font-semibold">client operations</span> with architectural precision.
              </p>
              <div className="hero-reveal flex flex-col sm:flex-row gap-6">
                <Link to="/onboarding" className="bg-[#D96B52] text-[#FAF8F3] px-10 py-4 font-semibold hover:scale-105 transition-all duration-300 shadow-xl group rounded-sm text-center">
                  Start Building 
                  <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">→</span>
                </Link>
                <Link to="/auth" className="bg-[#FAF8F3]/50 backdrop-blur-md border border-[#3B241A]/20 text-[#3B241A] px-10 py-4 font-semibold hover:bg-[#3B241A] hover:text-[#FAF8F3] transition-all flex items-center justify-center gap-3 rounded-sm">
                  View Technical Demo
                </Link>
              </div>
            </div>
            {/* 3D Scene */}
            <div className="hero-reveal lg:col-span-4 relative hidden lg:block h-[500px]">
              <Hero3DScene />
              {/* Technical overlays */}
              <div className="absolute top-0 right-0 p-6 border-r border-t border-[#D96B52]/30 text-xs text-[#D96B52] mix-blend-multiply font-mono tracking-wider">
                STUDIO_v1.0<br/>AI_ENGINE: ACTIVE
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By */}
        <section className="py-20 relative overflow-hidden scroll-reveal">
          <div className="max-w-7xl mx-auto px-6 md:px-16 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/4">
              <h3 className="text-sm font-semibold text-[#D96B52] uppercase tracking-widest leading-tight">Powering Global <br/>Creatives</h3>
            </div>
            <div className="md:w-3/4 flex flex-wrap justify-between items-center gap-10 opacity-60 grayscale font-serif text-2xl font-bold">
              <span>Figma</span>
              <span>Notion</span>
              <span>Webflow</span>
              <span>Framer</span>
            </div>
          </div>
        </section>

        {/* Immersive Bento Section */}
        <section id="features" className="py-32 relative">
          <div className="max-w-7xl mx-auto px-6 md:px-16">
            <div className="mb-24 flex flex-col md:flex-row justify-between items-end gap-8 scroll-reveal">
              <div className="max-w-2xl">
                <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight">Operational <span className="text-[#D96B52] italic">Superiority</span> by Design.</h2>
                <p className="text-lg text-[#504440]">We built the engine so you can focus on the creative work. Paperwork is not a feature; it's automated.</p>
              </div>
              <div className="hidden md:block pb-2">
                <div className="w-32 h-0.5 bg-[#D96B52]"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Feature 1 */}
              <div className="md:col-span-7 bg-white/40 backdrop-blur-sm border border-[#3B241A]/10 p-12 lg:p-16 group hover:border-[#D96B52] transition-all duration-500 scroll-reveal rounded-md">
                <h3 className="font-serif text-3xl font-bold mb-4">Smart <span className="text-[#D96B52]">Pricing Engine</span></h3>
                <p className="text-lg text-[#504440] max-w-md">Our AI transforms vague project scopes into highly optimized <span className="text-[#3B241A] font-semibold">market-rate estimates</span> instantly based on your profile.</p>
              </div>
              
              {/* Feature 2 */}
              <div className="md:col-span-5 bg-[#3B241A] p-12 lg:p-16 text-[#FAF8F3] flex flex-col justify-center group hover:bg-[#D96B52] transition-all duration-500 scroll-reveal rounded-md shadow-2xl">
                <h3 className="font-serif text-3xl font-bold mb-4">Neural <span className="italic opacity-80">Paperwork</span></h3>
                <p className="opacity-80 text-base">Generate beautiful proposals, contracts, and invoices that stay perfectly in sync with project scope changes.</p>
              </div>

              {/* Feature 3 */}
              <div className="md:col-span-5 bg-white/40 backdrop-blur-sm border border-[#3B241A]/10 p-12 lg:p-16 group hover:border-[#D96B52] transition-all duration-500 scroll-reveal rounded-md">
                <h3 className="font-serif text-3xl font-bold mb-4">Unified CRM</h3>
                <p className="text-base text-[#504440]">Keep all client details, ongoing project statuses, and payment histories in a single, perfectly organized workspace.</p>
              </div>

              {/* Feature 4 */}
              <div className="md:col-span-7 bg-[#D96B52]/5 backdrop-blur-sm border border-[#D96B52]/20 p-12 lg:p-16 group hover:bg-[#FAF8F3] transition-all duration-500 scroll-reveal rounded-md">
                <h3 className="font-serif text-3xl font-bold mb-4">Client Portals</h3>
                <p className="text-lg text-[#504440] max-w-md">Give your clients a premium experience with a dedicated workspace to view proposals, pay invoices, and approve milestones.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-32 bg-[#3B241A] text-[#FAF8F3] relative overflow-hidden">
          <div className="absolute -right-20 top-0 text-[300px] font-serif font-black opacity-[0.03] leading-none select-none">STUDIO</div>
          <div className="max-w-7xl mx-auto px-6 md:px-16 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="scroll-reveal">
                <h2 className="font-serif text-5xl md:text-[64px] font-bold mb-10 leading-tight">The <br/><span className="text-[#D96B52]">Workflow</span> <br/>Standard.</h2>
                <p className="text-lg opacity-70 max-w-md mb-16">Freelancing isn't just delivering files; it's a continuous state of client management. We've redesigned the pipeline.</p>
                <div className="space-y-12">
                  <div className="flex gap-8 group">
                    <span className="font-serif text-[#D96B52] opacity-30 text-5xl font-bold group-hover:opacity-100 transition-opacity">01</span>
                    <div>
                      <h4 className="font-serif text-2xl font-bold mb-2">Scope & Estimate</h4>
                      <p className="opacity-70">Define project requirements and let AI suggest the perfect price based on market rates.</p>
                    </div>
                  </div>
                  <div className="flex gap-8 group">
                    <span className="font-serif text-[#D96B52] opacity-30 text-5xl font-bold group-hover:opacity-100 transition-opacity">02</span>
                    <div>
                      <h4 className="font-serif text-2xl font-bold mb-2">Propose & Win</h4>
                      <p className="opacity-70">Send high-converting, beautifully designed proposals that clients can approve instantly.</p>
                    </div>
                  </div>
                  <div className="flex gap-8 group">
                    <span className="font-serif text-[#D96B52] opacity-30 text-5xl font-bold group-hover:opacity-100 transition-opacity">03</span>
                    <div>
                      <h4 className="font-serif text-2xl font-bold mb-2">Invoice & Get Paid</h4>
                      <p className="opacity-70">Generate precise invoices linked directly to approved proposals with zero manual data entry.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block relative scroll-reveal">
                <div className="aspect-[4/5] bg-[#FAF8F3]/5 border border-[#FAF8F3]/10 relative overflow-hidden rounded-sm group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#D96B52]/20 to-transparent"></div>
                  <div className="p-12 h-full flex flex-col justify-end relative z-10">
                    <div className="text-sm text-[#D96B52] uppercase tracking-widest mb-4 font-semibold">Engine Status</div>
                    <div className="text-[64px] font-serif font-bold leading-none mb-8">ACTIVE</div>
                    <div className="space-y-2 opacity-50 font-mono text-xs">
                      <div>&gt; BOOTING_WORKSPACE...</div>
                      <div>&gt; GENERATING_PROPOSAL...</div>
                      <div>&gt; AWAITING_CLIENT_SIGNOFF...</div>
                      <div>&gt; INVOICE_READY.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-32 bg-[#FAF8F3]">
          <div className="max-w-7xl mx-auto px-6 md:px-16">
            <div className="text-center mb-24 scroll-reveal">
              <h2 className="font-serif text-4xl md:text-[56px] font-bold text-[#3B241A] mb-6">Investment in <span className="italic text-[#D96B52]">Scale</span>.</h2>
              <p className="text-lg text-[#504440]">Simple, transparent, architectural tiers.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {/* Starter */}
              <div className="p-10 border border-[#3B241A]/15 hover:border-[#3B241A] transition-colors group scroll-reveal rounded-md bg-white">
                <h3 className="text-sm font-semibold text-[#504440] uppercase tracking-[0.2em] mb-10">Foundation</h3>
                <div className="flex items-baseline gap-2 mb-10">
                  <span className="font-serif text-[64px] font-bold text-[#3B241A]">$0</span>
                  <span className="text-[#504440]">/mo</span>
                </div>
                <ul className="space-y-5 mb-12 opacity-80 text-base">
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> 3 Active Projects</li>
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> AI Pricing Engine (Basic)</li>
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> Standard Templates</li>
                </ul>
                <Link to="/onboarding" className="block text-center w-full py-4 border-2 border-[#3B241A] text-[#3B241A] font-semibold hover:bg-[#3B241A] hover:text-[#FAF8F3] transition-all rounded-sm">
                  Start for Free
                </Link>
              </div>

              {/* Pro */}
              <div className="p-10 bg-[#3B241A] text-[#FAF8F3] relative overflow-hidden group scroll-reveal shadow-2xl rounded-md">
                <div className="absolute top-0 right-0 bg-[#D96B52] text-[#FAF8F3] px-6 py-1.5 text-xs font-semibold uppercase tracking-widest">Recommended</div>
                <h3 className="text-sm font-semibold text-[#D96B52] uppercase tracking-[0.2em] mb-10">Elite Architect</h3>
                <div className="flex items-baseline gap-2 mb-10">
                  <span className="font-serif text-[64px] font-bold text-[#FAF8F3]">$19</span>
                  <span className="opacity-70">/mo</span>
                </div>
                <ul className="space-y-5 mb-12 text-base">
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> Unlimited Projects</li>
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> Advanced Neural Logic AI</li>
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> Custom Client Portals</li>
                  <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 bg-[#D96B52] rounded-full"></span> White-label Invoicing</li>
                </ul>
                <Link to="/onboarding" className="block text-center w-full py-4 bg-[#D96B52] text-[#FAF8F3] font-semibold hover:brightness-110 transition-all shadow-xl rounded-sm">
                  Go Professional
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#3B241A]/10 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-24">
            <div className="md:col-span-6">
              <div className="font-serif text-3xl font-bold text-[#3B241A] mb-6">StudioDesk</div>
              <p className="text-[#504440] max-w-sm mb-10 leading-relaxed">
                Setting the architectural gold standard for independent creative operations. Built for creatives, by creatives.
              </p>
              <div className="flex gap-6 font-semibold text-sm">
                <a className="text-[#3B241A] hover:text-[#D96B52] transition-colors" href="#">Twitter</a>
                <a className="text-[#3B241A] hover:text-[#D96B52] transition-colors" href="#">LinkedIn</a>
              </div>
            </div>
            <div className="md:col-span-3">
              <h4 className="text-xs font-semibold text-[#D96B52] uppercase tracking-widest mb-8">Platform</h4>
              <nav className="flex flex-col gap-4 text-sm font-medium">
                <a className="text-[#504440] hover:text-[#3B241A] transition-colors" href="#product">Product</a>
                <a className="text-[#504440] hover:text-[#3B241A] transition-colors" href="#features">Features</a>
                <a className="text-[#504440] hover:text-[#3B241A] transition-colors" href="#pricing">Pricing</a>
              </nav>
            </div>
            <div className="md:col-span-3">
              <h4 className="text-xs font-semibold text-[#D96B52] uppercase tracking-widest mb-8">Legal</h4>
              <nav className="flex flex-col gap-4 text-sm font-medium">
                <Link to="/privacy" className="text-[#504440] hover:text-[#3B241A] transition-colors">Privacy Policy</Link>
                <Link to="/tos" className="text-[#504440] hover:text-[#3B241A] transition-colors">Terms of Service</Link>
              </nav>
            </div>
          </div>
          <div className="pt-8 border-t border-[#3B241A]/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[#504440] text-xs font-medium">
            <span>© {new Date().getFullYear()} StudioDesk. Handcrafted for performance.</span>
            <div className="flex gap-8 font-mono">
              <span>SYSTEM STATUS: OPERATIONAL</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
