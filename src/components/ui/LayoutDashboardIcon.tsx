"use client";

import React from 'react';
import { LayoutDashboard } from 'lucide-react';

interface LayoutDashboardIconProps {
  size?: number;
  className?: string;
}

export default function LayoutDashboardIcon({ size = 24, className = "" }: LayoutDashboardIconProps) {
  return <LayoutDashboard size={size} className={className} />;
}