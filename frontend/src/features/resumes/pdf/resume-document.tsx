import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  Image as PdfImage,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ResumeDocument as ResumeData, SectionKey } from "../schema";
import { SECTION_LABELS } from "../templates";

export function ResumeDocument({
  document: doc,
  photo,
}: {
  document: ResumeData;
  photo?: string;
}) {
  const accent = { blue: "#005aff", teal: "#08776c", slate: "#334155" }[
    doc.settings.accent
  ];
  const fontSize = { small: 9, normal: 10, large: 11 }[doc.settings.font_size];
  const styles = StyleSheet.create({
    page: {
      fontFamily: "ResumeVietnam",
      fontSize,
      lineHeight: doc.settings.line_spacing === "compact" ? 1.4 : 1.6,
      padding: 36,
      color: "#16243b",
    },
    header: {
      borderBottomWidth: doc.template_key === "minimal" ? 0 : 2,
      borderBottomColor: accent,
      paddingBottom: 14,
      marginBottom: 16,
    },
    name: { fontSize: 23, fontWeight: 700, color: accent, lineHeight: 1.5 },
    headline: { fontSize: 12, marginTop: 7, lineHeight: 1.6 },
    contact: { fontSize: 9, color: "#475569", marginTop: 7 },
    photo: { width: 64, height: 64, objectFit: "cover", marginBottom: 10 },
    section: { marginBottom: 12 },
    title: {
      fontSize: 12,
      fontWeight: 700,
      color: accent,
      marginBottom: 6,
      lineHeight: 1.6,
    },
    item: { marginBottom: 8 },
    strong: { fontWeight: 700 },
    muted: { color: "#475569", fontSize: 9 },
    summary: { marginBottom: 14 },
    columns: { flexDirection: "row", gap: 22 },
    sidebar: { width: "28%" },
    main: { width: "68%" },
    pageNumber: {
      position: "absolute",
      bottom: 18,
      left: 36,
      right: 36,
      textAlign: "right",
      fontSize: 8,
      color: "#64748b",
    },
  });
  const basics = doc.content.basics;
  const sections = doc.settings.section_order.filter(
    (key) =>
      !doc.settings.hidden_sections.includes(key) && doc.content[key].length,
  );
  const section = (key: SectionKey) => (
    <View key={key} style={styles.section}>
      <Text style={styles.title} minPresenceAhead={30}>
        {SECTION_LABELS[key]}
      </Text>
      {doc.content[key].map((item) => {
        const data = item as unknown as Record<string, string | boolean | null>;
        const title = data.position || data.qualification || data.name;
        const sub =
          data.company ||
          data.school ||
          data.role ||
          data.issuer ||
          data.proficiency;
        const date = data.start_month
          ? `${data.start_month} — ${data.current ? "Hiện tại" : data.end_month || ""}`
          : data.issued_month;
        return (
          <View key={item.id} style={styles.item}>
            <Text style={styles.strong} minPresenceAhead={18}>
              {String(title || "")}
            </Text>
            {sub ? <Text>{String(sub)}</Text> : null}
            {date ? <Text style={styles.muted}>{String(date)}</Text> : null}
            {data.description || data.detail ? (
              <Text orphans={2} widows={2}>
                {String(data.description || data.detail)}
              </Text>
            ) : null}
            {data.url ? (
              <Link style={styles.muted} src={String(data.url)}>
                {String(data.url)}
              </Link>
            ) : null}
          </View>
        );
      })}
    </View>
  );
  const contact = (
    <View>
      {photo ? <PdfImage src={photo} style={styles.photo} /> : null}
      {[basics.email, basics.phone, basics.city]
        .filter(Boolean)
        .map((value) => (
          <Text key={value} style={styles.contact}>
            {value}
          </Text>
        ))}
      {basics.links
        .filter((item) => item.url)
        .map((item) => (
          <Link key={item.id} src={item.url} style={styles.contact}>
            {item.label || item.url}
          </Link>
        ))}
    </View>
  );
  const isModern = doc.template_key === "modern";
  return (
    <Document title={doc.name} author={basics.full_name} language="vi-VN">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} wrap={false}>
          <Text style={styles.name}>{basics.full_name}</Text>
          <Text style={styles.headline}>{basics.headline}</Text>
          {!isModern && contact}
        </View>
        {isModern ? (
          <View style={styles.columns}>
            <View style={styles.sidebar}>
              {contact}
              {sections
                .filter((key) => key === "skills" || key === "languages")
                .map(section)}
            </View>
            <View style={styles.main}>
              {basics.summary ? (
                <Text style={styles.summary}>{basics.summary}</Text>
              ) : null}
              {sections
                .filter((key) => key !== "skills" && key !== "languages")
                .map(section)}
            </View>
          </View>
        ) : (
          <View>
            {basics.summary ? (
              <Text style={styles.summary}>{basics.summary}</Text>
            ) : null}
            {sections.map(section)}
          </View>
        )}
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
