"use client";

import type { DataUIPart } from "ai";
import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";
import type { ModelProbeState } from "@/components/probe-grid";
import type { CustomUIDataTypes } from "@/lib/types";

type DataStreamContextValue = {
  dataStream: DataUIPart<CustomUIDataTypes>[];
  setDataStream: React.Dispatch<
    React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>
  >;
  probeState: Map<string, ModelProbeState>;
  setProbeState: React.Dispatch<
    React.SetStateAction<Map<string, ModelProbeState>>
  >;
  probeActive: boolean;
  setProbeActive: React.Dispatch<React.SetStateAction<boolean>>;
  probeStatusMessage: string;
  setProbeStatusMessage: React.Dispatch<React.SetStateAction<string>>;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>(
    []
  );
  const [probeState, setProbeState] = useState<Map<string, ModelProbeState>>(
    new Map()
  );
  const [probeActive, setProbeActive] = useState(false);
  const [probeStatusMessage, setProbeStatusMessage] = useState("");

  const value = useMemo(
    () => ({
      dataStream,
      setDataStream,
      probeState,
      setProbeState,
      probeActive,
      setProbeActive,
      probeStatusMessage,
      setProbeStatusMessage,
    }),
    [dataStream, probeState, probeActive, probeStatusMessage]
  );

  return (
    <DataStreamContext.Provider value={value}>
      {children}
    </DataStreamContext.Provider>
  );
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error("useDataStream must be used within a DataStreamProvider");
  }
  return context;
}
