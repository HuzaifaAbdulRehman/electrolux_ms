'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  FileText,
  Bell,
  MapPin,
  CreditCard
} from 'lucide-react';
import VantaBackground from '@/components/homepage/VantaBackground';
import AnimatedStats from '@/components/homepage/AnimatedStats';
import PowerGridVisualization from '@/components/homepage/PowerGridVisualization';
import SystemMetrics from '@/components/homepage/SystemMetrics';

export default function HomePage() {
  // Real features from the actual Electrolux EMS project
  const realFeatures = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Connection Request Management",
      description: "Streamlined application process with document upload, real-time status tracking, and automated approval workflow",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Zone-Based Load Shedding",
      description: "Smart distribution across 5 zones (A-E) with automated outage notifications and scheduled power management",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Automated Bill Generation",
      description: "Real-time meter readings with slab-based tariff calculation, GST integration, and instant bill generation",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Multiple Payment Methods",
      description: "Support for Credit/Debit cards, UPI, Bank Transfer, Wallets, Cash, and Cheque with instant payment confirmation",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Multi-Role Access Control",
      description: "Dedicated portals for Customers, Employees, and Admins with role-specific features and secure authentication",
      color: "from-red-500 to-rose-500"
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Real-Time Notifications",
      description: "Instant alerts for bill generation, payment confirmation, outage schedules, and complaint status updates",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Vanta.js Animated Background - Now with z-index: -1 */}
      <VantaBackground />

      {/* All content in a wrapper with positive z-index */}
      <div className="relative z-10">
        {/* Navigation Bar */}
        <nav className="fixed w-full top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <motion.div
                  className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center relative"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(251, 191, 36, 0)',
                      '0 0 20px 5px rgba(251, 191, 36, 0.4)',
                      '0 0 0 0 rgba(251, 191, 36, 0)'
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <Zap className="w-6 h-6 text-white" />
                </motion.div>
                <span className="text-2xl font-bold text-white">Electrolux</span>
              </div>

              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
                <a href="#services" className="text-gray-300 hover:text-white transition-colors">Services</a>
              </div>

              <div className="flex items-center space-x-3">
                <Link href="/track-application" className="px-5 py-2 text-white hover:text-gray-200 transition-colors text-sm font-medium">
                  Track Application
                </Link>
                <Link href="/login" className="px-5 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 text-sm font-medium">
                  Login
                </Link>
                <Link href="/apply-connection" className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 text-sm font-medium">
                  Apply Connection
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6">
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                className="space-y-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <motion.div
                  className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></span>
                  <span className="text-sm text-gray-300">Real-Time Energy Management</span>
                </motion.div>

                <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                  <span className="block">Electrolux</span>
                  <span className="block mt-3 text-3xl lg:text-4xl font-light text-gray-300 italic">
                    Energy that moves life
                  </span>
                  <span className="block mt-2 text-2xl lg:text-3xl font-normal bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent pb-2">
                    Powering tomorrow, today
                  </span>
                </h1>

                <p className="text-xl text-gray-300 leading-relaxed mt-6">
                  A complete electricity management system with zone-based distribution, automated billing, and real-time monitoring across 5 distribution zones.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/apply-connection" className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full hover:shadow-xl hover:shadow-orange-500/50 transition-all duration-300">
                    <span className="font-semibold">Apply for New Connection</span>
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/track-application" className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300">
                    <span className="font-semibold">Track Application</span>
                  </Link>
                </div>

                {/* Animated Stats Component */}
                <AnimatedStats />
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="relative rounded-2xl p-6 min-h-[500px] bg-gradient-to-br from-slate-800/40 to-purple-900/40 border border-purple-500/20 shadow-xl shadow-purple-500/10">
                  <PowerGridVisualization />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section - REAL PROJECT FEATURES */}
        <section id="features" className="py-20 px-6">
          <div className="container mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-white">
                Comprehensive Energy Management
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Built-in features designed for modern electricity distribution and customer service
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {realFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  className="group relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 h-full group-hover:bg-white/[0.07]">
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-200 transition-colors">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 px-6">
          <div className="container mx-auto">
            <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-3xl p-12 backdrop-blur-sm border border-orange-500/20 shadow-xl shadow-orange-500/5">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-4xl font-bold text-white">
                    Why Choose Electrolux?
                  </h2>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    A complete DBMS-powered solution for electricity distribution with role-based access control and real-time operations.
                  </p>
                  <div className="space-y-4">
                    {[
                      "5-Zone distribution system (Zone A-E)",
                      "Real-time meter reading and bill generation",
                      "Multi-role access (Admin, Employee, Customer)",
                      "Automated complaint and outage management",
                      "Comprehensive payment tracking and analytics"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10">
                  <SystemMetrics />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-orange-500/30 blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl p-12 lg:p-16 text-center shadow-2xl shadow-orange-500/20">
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                  Ready to Power Your Future?
                </h2>
                <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                  Join thousands of satisfied customers with seamless connection approval, real-time monitoring, and 24/7 support
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/apply-connection" className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:shadow-xl transition-all duration-300">
                    <Zap className="w-5 h-5 mr-2" />
                    <span>Apply for New Connection</span>
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                  <Link href="/login" className="inline-flex items-center px-8 py-4 bg-white/90 text-gray-900 rounded-full font-semibold hover:shadow-xl transition-all duration-300">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>Already a Customer? Login</span>
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-white/10">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Electrolux</span>
              </div>
              <p className="text-gray-400">© 2025 Electrolux EMS. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
