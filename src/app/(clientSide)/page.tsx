import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Calendar,
  BarChart3,
  Users,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { getServerAuthSession } from "@/server/auth/helpers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerAuthSession();
  if (session) {
    // Pick the default workspace if exists
    const workspaces = session.user.workspaces ?? [];
    if (workspaces.length > 0) {
      // redirect directly to first workspace dashboard
      redirect(`/workspace/${workspaces[0]?.id}/dashboard`);
    } else {
      // no workspace yet
      redirect("/workspace");
    }
  }

  const features = [
    {
      icon: Zap,
      title: "AI Content Generation",
      description:
        "Create engaging posts with advanced AI that understands your brand voice and audience.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description:
        "Optimize posting times across all platforms with intelligent scheduling algorithms.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Track performance, engagement, and growth with comprehensive analytics dashboard.",
    },
    {
      icon: Users,
      title: "Audience Insights",
      description:
        "Understand your audience better with detailed demographic and behavior analysis.",
    },
  ];

  const socialPlatforms = [
    { icon: Instagram, name: "Instagram", color: "text-pink-500" },
    { icon: Twitter, name: "Twitter", color: "text-blue-500" },
    { icon: Facebook, name: "Facebook", color: "text-blue-600" },
    { icon: Linkedin, name: "LinkedIn", color: "text-blue-700" },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$19",
      description: "Perfect for individuals and small businesses",
      features: [
        "3 Social accounts",
        "50 AI-generated posts/month",
        "Basic analytics",
        "Email support",
      ],
    },
    {
      name: "Professional",
      price: "$49",
      description: "Ideal for growing businesses and agencies",
      features: [
        "10 Social accounts",
        "200 AI-generated posts/month",
        "Advanced analytics",
        "Priority support",
        "Team collaboration",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      description: "For large organizations and agencies",
      features: [
        "Unlimited social accounts",
        "Unlimited AI-generated posts",
        "Custom analytics",
        "24/7 phone support",
        "White-label solution",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-700 dark:text-blue-300 border-0">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Social Media Management
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-slate-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
            Supercharge Your Social Media Presence
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Create, schedule, and optimize your social media content with AI.
            Connect all your accounts, generate engaging posts, and grow your
            audience effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg bg-transparent"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Social Platforms */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            Connect All Your Platforms
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage all your social media accounts from one powerful dashboard
          </p>
        </div>
        <div className="flex justify-center items-center gap-8 flex-wrap">
          {socialPlatforms.map((platform, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 shadow-lg"
            >
              <platform.icon className={`w-8 h-8 ${platform.color}`} />
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-12 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Powerful features designed to help you grow your social media
            presence
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 hover:shadow-2xl transition-shadow"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            Choose Your Plan
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Start free, upgrade when you're ready to scale
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card
              key={index}
              className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 relative ${
                plan.popular ? "ring-2 ring-blue-600" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">
                  {plan.name}
                </CardTitle>
                <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                  {plan.price}
                  <span className="text-lg font-normal text-slate-600 dark:text-slate-400">
                    /month
                  </span>
                </div>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {feature}
                    </span>
                  </div>
                ))}
                <Button
                  className={`w-full mt-6 ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900"
                  }`}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="text-center py-16">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Social Media?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of creators and businesses already using Social
              Manager
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-slate-100"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
