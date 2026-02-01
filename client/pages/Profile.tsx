import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { User } from "@shared/api";
import {
  User as UserIcon,
  LogOut,
  Edit,
  Shield,
  GraduationCap,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    examType: "",
    preparationStage: "",
    gender: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (!data || !data.user) {
          navigate("/login");
          return;
        }
        setUser(data.user);
        setFormData({
          name: data.user.name || "",
          email: data.user.email || "",
          examType: data.user.examType || "CHSL",
          preparationStage: data.user.preparationStage || "Intermediate",
          gender: data.user.gender || "male",
        });
      } catch (error) {
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedUser = await authService.updateProfile({
        name: formData.name,
        examType: formData.examType,
        preparationStage: formData.preparationStage,
        gender: formData.gender,
        avatar: avatarPreview || undefined,
      });
      setUser(updatedUser);
      // Also sync formData with the response to ensure changes persist
      setFormData({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        examType: updatedUser.examType || "CHSL",
        preparationStage: updatedUser.preparationStage || "Intermediate",
        gender: updatedUser.gender || "male",
      });
      setAvatarPreview(null); // Reset preview after successful save
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const profileStrength = 85;

  return (
    <MainLayout userName={user.name} userAvatar={user.avatar} hideSidebar={true}>
      <div className="flex-1 h-full overflow-y-auto bg-background font-['Plus_Jakarta_Sans'] text-foreground relative transition-colors duration-300">

        {/* Swirl Background with Animated Blobs */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-30 blur-[90px] animate-[float_25s_infinite_ease-in-out]"
            style={{
              background: 'radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)',
              mixBlendMode: 'screen'
            }}
          ></div>
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-30 blur-[90px] animate-[float_25s_infinite_ease-in-out]"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
              mixBlendMode: 'screen',
              animationDelay: '8s'
            }}
          ></div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 px-8 py-6 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Profile Settings</h1>
            <p className="text-xs text-muted-foreground font-light mt-1">Manage your sanctuary preferences.</p>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-all text-sm font-medium backdrop-blur-sm group"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20">

          {/* Profile Card - Left Side */}
          <section className="lg:col-span-4 lg:sticky lg:top-32">
            <div className="glass-high rounded-[2rem] rounded-tl-[1rem] rounded-br-[4rem] p-8 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/20 transition-all duration-500 shadow-lg">

              {/* Glow Effect */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-[50px] pointer-events-none"></div>

              {/* Profile Picture */}
              <div className="relative z-10 w-36 h-36 rounded-full p-[2px] bg-gradient-to-r from-secondary to-primary mb-6 shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden border-[3px] border-card bg-muted relative">
                  <img
                    alt="Profile Picture"
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    src={avatarPreview || user.avatar || "https://via.placeholder.com/150"}
                  />
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2.5 rounded-full hover:scale-110 transition-all shadow-lg border-2 border-card cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                </label>
              </div>

              {/* User Info */}
              <div className="relative z-10 w-full">
                <h2 className="text-2xl font-bold text-foreground mb-1 tracking-tight">{user.name}</h2>
                <p className="text-sm text-primary font-medium mb-5 tracking-wide">{user.email}</p>
                <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1.5 rounded-full w-fit mx-auto border border-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]"></span>
                  Online
                </div>
              </div>

              {/* Profile Strength */}
              <div className="mt-10 w-full border-t border-border pt-6 relative z-10">
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-muted-foreground font-light">Profile Strength</span>
                  <span className="font-bold text-secondary">{profileStrength}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full relative"
                    style={{ width: `${profileStrength}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Forms Section - Right Side */}
          <section className="lg:col-span-8 flex flex-col gap-8 relative">

            {/* Decorative Line */}
            <div className="absolute left-8 top-10 bottom-10 w-[1px] bg-gradient-to-b from-secondary via-primary to-transparent opacity-40 hidden md:block"></div>

            {/* Personal Information */}
            <div className="glass-high rounded-3xl p-8 ml-0 md:ml-6 relative overflow-hidden group shadow-lg">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>

              <div className="flex items-center gap-4 mb-8 relative z-10 border-b border-border pb-4">
                <div className="p-2 rounded-lg bg-muted text-primary">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground tracking-wide">Personal Information</h3>
              </div>

              <form className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                  <div className="group/input">
                    <label className="block text-[11px] font-bold text-primary/70 mb-2 tracking-widest uppercase transition-colors group-focus-within/input:text-primary">
                      Full Name
                    </label>
                    <input
                      className="w-full bg-transparent border-b border-border pb-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-b-2 focus:border-primary transition-all"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="group/input opacity-70">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-2 tracking-widest uppercase">
                      Email Address
                    </label>
                    <input
                      className="w-full bg-transparent border-b border-dashed border-border pb-3 text-muted-foreground cursor-not-allowed focus:outline-none"
                      disabled
                      type="email"
                      value={formData.email}
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 font-light italic">* Contact support to update email</p>
                  </div>
                  <div className="group/input">
                    <label className="block text-[11px] font-bold text-primary/70 mb-2 tracking-widest uppercase transition-colors group-focus-within/input:text-primary">
                      Gender
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-transparent border-b border-border pb-3 text-foreground appearance-none cursor-pointer focus:outline-none focus:border-b-2 focus:border-primary transition-all"
                        value={formData.gender || "male"}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option className="bg-card text-foreground" value="male">Male</option>
                        <option className="bg-card text-foreground" value="female">Female</option>
                        <option className="bg-card text-foreground" value="other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-0 top-3 pointer-events-none text-muted-foreground group-hover/input:text-foreground transition-colors w-5 h-5" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Exam Focus */}
            <div className="glass-high rounded-3xl p-8 ml-0 md:ml-6 relative overflow-hidden group shadow-lg">
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-secondary/10 transition-colors duration-700"></div>

              <div className="flex items-center gap-4 mb-8 relative z-10 border-b border-border pb-4">
                <div className="p-2 rounded-lg bg-muted text-secondary">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground tracking-wide">Exam Focus</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 relative z-10">
                <div className="group/input">
                  <label className="block text-[11px] font-bold text-primary/70 mb-2 tracking-widest uppercase transition-colors group-focus-within/input:text-primary">
                    Target Exam
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-transparent border-b border-border pb-3 text-foreground appearance-none cursor-pointer focus:outline-none focus:border-b-2 focus:border-primary transition-all"
                      value={formData.examType}
                      onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    >
                      <option className="bg-card text-foreground">CHSL</option>
                      <option className="bg-card text-foreground">CGL</option>
                      <option className="bg-card text-foreground">MTS</option>
                      <option className="bg-card text-foreground">12th Boards</option>
                      <option className="bg-card text-foreground">NTPC</option>
                      <option className="bg-card text-foreground">JEE</option>
                      <option className="bg-card text-foreground">Other</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-3 pointer-events-none text-muted-foreground group-hover/input:text-foreground transition-colors w-5 h-5" />
                  </div>
                </div>
                <div className="group/input">
                  <label className="block text-[11px] font-bold text-primary/70 mb-2 tracking-widest uppercase transition-colors group-focus-within/input:text-primary">
                    Preparation Stage
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-transparent border-b border-border pb-3 text-foreground appearance-none cursor-pointer focus:outline-none focus:border-b-2 focus:border-primary transition-all"
                      value={formData.preparationStage}
                      onChange={(e) => setFormData({ ...formData, preparationStage: e.target.value })}
                    >
                      <option className="bg-card text-foreground">Beginner</option>
                      <option className="bg-card text-foreground">Intermediate</option>
                      <option className="bg-card text-foreground">Advanced</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-3 pointer-events-none text-muted-foreground group-hover/input:text-foreground transition-colors w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="glass-high rounded-2xl p-6 ml-0 md:ml-6 flex justify-between items-center group hover:bg-glass-bg transition-colors border-l-4 border-l-primary/50 shadow-lg">
              <div className="flex items-center gap-4">
                <Shield className="text-muted-foreground group-hover:text-primary transition-colors duration-300 w-6 h-6" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Account Status</h3>
                  <p className="text-xs text-muted-foreground font-light mt-0.5">Your account is verified and secured.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 uppercase tracking-wider">
                Verified
              </span>
            </div>

            {/* Action Buttons */}
            <div className="ml-0 md:ml-6 pt-6 flex justify-end gap-5">
              <button className="px-6 py-3 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="relative overflow-hidden group px-10 py-3 rounded-full bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                <span className="relative z-10 font-bold tracking-wide text-sm">
                  {isSaving ? "Saving..." : "Save Changes"}
                </span>
              </button>
            </div>
          </section>
        </div>

        <style>{`
          @keyframes float {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -40px) scale(1.05); }
            66% { transform: translate(-20px, 20px) scale(0.95); }
            100% { transform: translate(0, 0) scale(1); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </MainLayout>
  );
}
