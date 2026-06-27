import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToStream, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import path from "path";
import fs from "fs";

const WHITE = "#ffffff";
const OFF_WHITE = "#fafafa";
const DARK_TEXT = "#333333";
const MUTED_TEXT = "#555555";

// The PDF styles
const getStyles = (brandPrimary: string, brandAccent: string) => StyleSheet.create({
  page: { backgroundColor: WHITE, color: DARK_TEXT, fontFamily: "Helvetica" },
  pageDark: { backgroundColor: brandPrimary, color: WHITE, fontFamily: "Helvetica" },
  // Common
  titleLarge: { fontSize: 48, fontWeight: "bold", color: brandPrimary, marginBottom: 10, lineHeight: 1.1 },
  titleMedium: { fontSize: 32, fontWeight: "bold", color: brandPrimary, marginBottom: 20 },
  titleMediumLight: { fontSize: 32, fontWeight: "bold", color: WHITE, marginBottom: 20 },
  text: { fontSize: 12, lineHeight: 1.5, color: DARK_TEXT },
  textMuted: { fontSize: 12, lineHeight: 1.5, color: MUTED_TEXT },
  textLight: { fontSize: 12, lineHeight: 1.5, color: WHITE },
  // Cover
  coverTop: { height: "70%", padding: 60, display: "flex", flexDirection: "column" },
  coverBottom: { height: "30%", backgroundColor: brandPrimary, padding: 60, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coverHeaderRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: "auto" },
  coverCompany: { fontSize: 16, color: MUTED_TEXT },
  coverDate: { fontSize: 16, color: MUTED_TEXT, textAlign: "right" },
  // TOC
  tocItem: { display: "flex", flexDirection: "row", borderBottom: `1 solid ${WHITE}`, paddingVertical: 15, alignItems: "center" },
  tocNum: { fontSize: 18, color: brandAccent, width: 40 },
  tocTitle: { fontSize: 16, color: WHITE },
  // Summary
  imgTop: { width: "100%", height: 350, objectFit: "cover" },
  quote: { fontSize: 48, color: brandAccent, fontWeight: "bold", marginTop: 20, marginBottom: -10 },
  // Split Left/Right
  splitPage: { display: "flex", flexDirection: "row", height: "100%" },
  splitLeft: { width: "50%", padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" },
  splitRight: { width: "50%" },
  splitImg: { width: "100%", height: "100%", objectFit: "cover" },
  // Lists & Icons
  listItemRow: { display: "flex", flexDirection: "row", marginBottom: 25 },
  listNumBig: { fontSize: 24, color: brandAccent, width: 40, fontWeight: "bold" },
  listIcon: { width: 20, height: 20, borderRadius: 10, border: `1 solid ${DARK_TEXT}`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 15, marginTop: 2 },
  listIconInner: { fontSize: 10, color: DARK_TEXT },
  // Tables
  tableRow: { display: "flex", flexDirection: "row", borderBottom: `1 solid ${MUTED_TEXT}`, paddingVertical: 12 },
  tableHeader: { fontWeight: "bold", color: brandAccent, fontSize: 12 },
  tableCell: { fontSize: 11, color: DARK_TEXT },
  // Contact
  contactRow: { display: "flex", flexDirection: "row", alignItems: "center", marginBottom: 10 },
  contactIcon: { width: 16, marginRight: 10 },
});

export async function renderProposalPdf(input: any): Promise<Uint8Array> {
  const { title, intro, content, profile, client, issued_date } = input;
  const { 
    proposal_objectives, 
    proposal_scope_inclusions, 
    proposal_scope_exclusions, 
    proposal_deliverables,
    proposal_methodology, 
    proposal_timeline, 
    proposal_risks, 
    proposal_stakeholders,
    proposal_outcomes, 
    line_items 
  } = content;

  // The dark slate/green from PDF as default
  const brandPrimary = profile?.brand_color_primary || "#40524c"; 
  const brandAccent = profile?.brand_color_secondary || profile?.brand_color_accent || "#b8a99a"; // A warm accent

  const styles = getStyles(brandPrimary, brandAccent);
  const formattedDate = issued_date ? format(new Date(issued_date), "MMMM\nyyyy") : "Draft";

  // Use base64 data URIs so react-pdf embeds them perfectly regardless of OS path issues
  const getImageSrc = (filename: string) => {
    try {
      const filePath = path.join(process.cwd(), "public", "proposal", filename);
      const data = fs.readFileSync(filePath);
      return `data:image/jpeg;base64,${data.toString("base64")}`;
    } catch (e) {
      console.error("Failed to load image:", filename, e);
      return "";
    }
  };

  const hasItems = (arr: any) => arr && arr.length > 0;
  
  const clientSigData = (input as any).client_signature_data;
  const clientSigObj = clientSigData && clientSigData !== "null" ? clientSigData : null;
  
  // Build Dynamic TOC
  const toc: { title: string, id: string }[] = [{ title: "Summary", id: "summary" }];
  if (hasItems(proposal_objectives)) toc.push({ title: "Project Objectives", id: "obj" });
  if (hasItems(proposal_scope_inclusions) || hasItems(proposal_scope_exclusions)) toc.push({ title: "Scope of the Project", id: "scope" });
  if (hasItems(proposal_deliverables)) toc.push({ title: "Key Deliverables", id: "deliv" });
  if (hasItems(proposal_methodology)) toc.push({ title: "Methodology", id: "meth" });
  if (hasItems(proposal_timeline)) toc.push({ title: "Timeline", id: "time" });
  if (hasItems(line_items)) toc.push({ title: "Budget Estimate", id: "budg" });
  if (hasItems(proposal_risks)) toc.push({ title: "Risk Assessment", id: "risk" });
  if (hasItems(proposal_stakeholders)) toc.push({ title: "Stakeholders", id: "stake" });
  if (hasItems(proposal_outcomes)) toc.push({ title: "Expected Outcomes", id: "out" });

  const ProposalDocument = (
    <Document>
      {/* 1. Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverHeaderRow}>
            <Text style={styles.coverCompany}>{profile?.business_name || "Studio"}</Text>
            <Text style={styles.coverDate}>{formattedDate}</Text>
          </View>
          <View style={{ marginTop: "auto" }}>
            <Text style={styles.titleLarge}>Project</Text>
            <Text style={styles.titleLarge}>Proposal ↗</Text>
            <Text style={{ fontSize: 24, color: brandAccent, marginTop: 10 }}>{title}</Text>
          </View>
        </View>
        <View style={styles.coverBottom}>
          <View>
            <Text style={{ color: WHITE, fontSize: 12, marginBottom: 5 }}>Prepared by :</Text>
            <Text style={{ color: WHITE, fontSize: 16, fontWeight: "bold" }}>{profile?.owner_name || profile?.business_name}</Text>
          </View>
          <View>
            <Text style={{ color: WHITE, fontSize: 12, marginBottom: 5 }}>Prepared for :</Text>
            <Text style={{ color: WHITE, fontSize: 16, fontWeight: "bold" }}>{client?.name || client?.company}</Text>
          </View>
        </View>
      </Page>

      {/* 2. TOC */}
      <Page size="A4" style={{ ...styles.pageDark, padding: 60 }}>
        <Text style={{ fontSize: 40, fontWeight: "bold", color: WHITE, marginBottom: 40, marginTop: 40 }}>Table of Contents</Text>
        <View style={{ borderTop: `1 solid ${WHITE}` }}>
          {toc.map((item, idx) => (
            <View key={idx} style={styles.tocItem}>
              <Text style={styles.tocNum}>0{idx + 1}</Text>
              <Text style={styles.tocTitle}>{item.title}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* 3. Summary */}
      <Page size="A4" style={styles.page}>
        <Image src={getImageSrc("summary.png")} style={styles.imgTop} />
        <View style={{ padding: 40 }}>
          <Text style={styles.titleMedium}>Summary</Text>
          <Text style={styles.quote}>“</Text>
          <Text style={styles.text}>{intro}</Text>
        </View>
      </Page>

      {/* 4. Objectives */}
      {hasItems(proposal_objectives) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.splitPage}>
            <View style={styles.splitLeft}>
              <Text style={styles.titleMedium}>Objectives</Text>
              <View style={{ marginTop: 20 }}>
                {proposal_objectives.map((obj: string, i: number) => (
                  <View key={i} style={{ marginBottom: 30 }}>
                    <Text style={styles.listNumBig}>0{i + 1}</Text>
                    <Text style={styles.text}>{obj}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.splitRight}>
              <Image src={getImageSrc("objectives.png")} style={styles.splitImg} />
            </View>
          </View>
        </Page>
      )}

      {/* 5. Scope */}
      {(hasItems(proposal_scope_inclusions) || hasItems(proposal_scope_exclusions)) && (
        <Page size="A4" style={{ ...styles.page, padding: 60 }}>
          <Text style={{ ...styles.titleMedium, marginTop: 100 }}>Scope of the Project</Text>
          
          {hasItems(proposal_scope_inclusions) && (
            <View style={{ marginTop: 30 }}>
              <View style={{ display: "flex", flexDirection: "row", alignItems: "center", borderBottom: `1 solid ${DARK_TEXT}`, paddingBottom: 10, marginBottom: 20 }}>
                <View style={styles.listIcon}><Text style={styles.listIconInner}>→</Text></View>
                <Text style={{ fontSize: 18, color: DARK_TEXT }}>Inclusion</Text>
              </View>
              <View style={{ paddingLeft: 35 }}>
                {proposal_scope_inclusions.map((item: string, i: number) => (
                  <Text key={i} style={{ ...styles.text, marginBottom: 10 }}>• {item}</Text>
                ))}
              </View>
            </View>
          )}

          {hasItems(proposal_scope_exclusions) && (
            <View style={{ marginTop: 40 }}>
              <View style={{ display: "flex", flexDirection: "row", alignItems: "center", borderBottom: `1 solid ${DARK_TEXT}`, paddingBottom: 10, marginBottom: 20 }}>
                <View style={styles.listIcon}><Text style={styles.listIconInner}>→</Text></View>
                <Text style={{ fontSize: 18, color: DARK_TEXT }}>Exclusion</Text>
              </View>
              <View style={{ paddingLeft: 35 }}>
                {proposal_scope_exclusions.map((item: string, i: number) => (
                  <Text key={i} style={{ ...styles.text, marginBottom: 10 }}>• {item}</Text>
                ))}
              </View>
            </View>
          )}
        </Page>
      )}

      {/* 6. Deliverables */}
      {hasItems(proposal_deliverables) && (
        <Page size="A4" style={{ ...styles.page, display: "flex", flexDirection: "column" }}>
          <View style={{ padding: 60, flex: 1, marginTop: 100 }}>
            <View style={{ display: "flex", flexDirection: "row", alignItems: "center", borderBottom: `1 solid ${DARK_TEXT}`, paddingBottom: 10, marginBottom: 30 }}>
              <View style={styles.listIcon}><Text style={styles.listIconInner}>→</Text></View>
              <Text style={{ fontSize: 24, color: DARK_TEXT }}>Key Deliverables</Text>
            </View>
            <View style={{ paddingLeft: 35 }}>
              {proposal_deliverables.map((item: string, i: number) => (
                <Text key={i} style={{ ...styles.text, marginBottom: 15, fontSize: 14 }}>• {item}</Text>
              ))}
            </View>
          </View>
          <Image src={getImageSrc("deliverables.png")} style={{ width: "100%", height: 350, objectFit: "cover" }} />
        </Page>
      )}

      {/* 7. Methodology */}
      {hasItems(proposal_methodology) && (
        <Page size="A4" style={{ ...styles.page, padding: 60 }}>
          <Text style={{ ...styles.titleMedium, marginTop: 60 }}>Methodology</Text>
          <View style={{ marginTop: 20 }}>
            {proposal_methodology.map((m: any, i: number) => (
              <View key={i} style={{ marginBottom: 25 }}>
                <Text style={{ fontSize: 18, color: brandAccent }}>0{i + 1}</Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: DARK_TEXT, marginBottom: 5 }}>{m.title}</Text>
                <Text style={styles.text}>{m.description}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* 8. Timeline */}
      {hasItems(proposal_timeline) && (
        <Page size="A4" style={styles.page}>
          <Image src={getImageSrc("timeline.png")} style={{ width: "100%", height: 300, objectFit: "cover" }} />
          <View style={{ padding: 40 }}>
            <Text style={styles.titleMedium}>Timeline</Text>
            <View style={{ marginTop: 20 }}>
              <View style={{ ...styles.tableRow, borderBottom: `2 solid ${DARK_TEXT}` }}>
                <Text style={{ ...styles.tableHeader, width: "25%" }}>Phase</Text>
                <Text style={{ ...styles.tableHeader, width: "20%" }}>Start Date</Text>
                <Text style={{ ...styles.tableHeader, width: "20%" }}>End Date</Text>
                <Text style={{ ...styles.tableHeader, width: "35%" }}>Key Milestones</Text>
              </View>
              {proposal_timeline.map((t: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={{ ...styles.tableCell, width: "25%", fontWeight: "bold" }}>{t.phase}</Text>
                  <Text style={{ ...styles.tableCell, width: "20%" }}>{t.start_date}</Text>
                  <Text style={{ ...styles.tableCell, width: "20%" }}>{t.end_date}</Text>
                  <Text style={{ ...styles.tableCell, width: "35%" }}>{t.milestone}</Text>
                </View>
              ))}
            </View>
          </View>
        </Page>
      )}

      {/* 9. Budget Estimate */}
      {hasItems(line_items) && (
        <Page size="A4" style={{ ...styles.page, padding: 60 }}>
          <Text style={{ ...styles.titleMedium, marginTop: 100 }}>Budget Estimate</Text>
          <View style={{ marginTop: 30 }}>
            <View style={{ ...styles.tableRow, borderBottom: `2 solid ${brandAccent}` }}>
              <Text style={{ ...styles.tableHeader, width: "70%" }}>Items</Text>
              <Text style={{ ...styles.tableHeader, width: "30%" }}>Estimate Cost</Text>
            </View>
            {line_items.map((li: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ ...styles.tableCell, width: "70%" }}>{li.label}</Text>
                <Text style={{ ...styles.tableCell, width: "30%" }}>{input.currency} {li.amount.toLocaleString()}</Text>
              </View>
            ))}
            <View style={{ ...styles.tableRow, marginTop: 20, borderBottom: "none" }}>
              <Text style={{ width: "70%", fontSize: 18, fontWeight: "bold", color: brandPrimary }}>Total</Text>
              <Text style={{ width: "30%", fontSize: 18, fontWeight: "bold", color: brandPrimary }}>{input.currency} {input.total.toLocaleString()}</Text>
            </View>
          </View>
        </Page>
      )}

      {/* 10. Risk Assessment */}
      {hasItems(proposal_risks) && (
        <Page size="A4" style={{ ...styles.page, display: "flex", flexDirection: "column" }}>
          <View style={{ padding: 40, marginTop: 60, flex: 1 }}>
            <Text style={styles.titleMedium}>Risk Assessment</Text>
            <View style={{ marginTop: 20 }}>
              <View style={{ ...styles.tableRow, borderBottom: `2 solid ${DARK_TEXT}` }}>
                <Text style={{ ...styles.tableHeader, width: "30%" }}>Risk</Text>
                <Text style={{ ...styles.tableHeader, width: "20%" }}>Likelihood</Text>
                <Text style={{ ...styles.tableHeader, width: "20%" }}>Impact</Text>
                <Text style={{ ...styles.tableHeader, width: "30%" }}>Mitigation Plan</Text>
              </View>
              {proposal_risks.map((r: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={{ ...styles.tableCell, width: "30%", fontWeight: "bold" }}>{r.risk}</Text>
                  <Text style={{ ...styles.tableCell, width: "20%" }}>{r.likelihood}</Text>
                  <Text style={{ ...styles.tableCell, width: "20%" }}>{r.impact}</Text>
                  <Text style={{ ...styles.tableCell, width: "30%" }}>{r.mitigation}</Text>
                </View>
              ))}
            </View>
          </View>
          <Image src={getImageSrc("risk.png")} style={{ width: "100%", height: 350, objectFit: "cover" }} />
        </Page>
      )}

      {/* 11. Stakeholders */}
      {hasItems(proposal_stakeholders) && (
        <Page size="A4" style={{ ...styles.page, padding: 60 }}>
          <Text style={{ ...styles.titleMedium, marginTop: 100 }}>Stakeholder</Text>
          <View style={{ marginTop: 20 }}>
            {proposal_stakeholders.map((s: any, i: number) => (
              <View key={i} style={{ display: "flex", flexDirection: "row", borderBottom: `1 solid ${DARK_TEXT}`, paddingVertical: 15 }}>
                <View style={{ ...styles.listIcon, marginTop: 0 }}><Text style={styles.listIconInner}>→</Text></View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: DARK_TEXT, marginBottom: 5 }}>{s.team}</Text>
                  <Text style={styles.textMuted}>Role : {s.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* 12. Outcomes */}
      {hasItems(proposal_outcomes) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.splitPage}>
            <View style={styles.splitLeft}>
              <Image src={getImageSrc("outcomes.png")} style={{ ...styles.splitImg, marginLeft: -40 }} />
            </View>
            <View style={{ ...styles.splitRight, padding: 40, paddingLeft: 20, justifyContent: "center" }}>
              <Text style={styles.titleMedium}>Expected{"\n"}Outcomes</Text>
              <View style={{ marginTop: 20 }}>
                {proposal_outcomes.map((out: string, i: number) => (
                  <View key={i} style={{ marginBottom: 20 }}>
                    <Text style={{ ...styles.listNumBig, fontSize: 20 }}>0{i + 1}</Text>
                    <Text style={styles.text}>{out}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Page>
      )}

      {/* 12.5 Signatures */}
      {(input as any).client_signature_data && (
        <Page size="A4" style={{ ...styles.page, padding: 60, justifyContent: "center" }}>
           <Text style={{ ...styles.titleMedium, textAlign: "center", marginBottom: 60 }}>Signatures</Text>
           <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View style={{ width: "40%", borderBottom: `1 solid ${DARK_TEXT}`, paddingBottom: 10 }}>
                 {clientSigObj && <Image src={clientSigObj} style={{ height: 60, objectFit: "contain", marginBottom: 10 }} />}
                 <Text style={{ fontSize: 14, fontWeight: "bold" }}>{input.client?.name || "Client"}</Text>
                 <Text style={{ fontSize: 10, color: MUTED_TEXT }}>Signed on {new Date((input as any).client_signed_at).toLocaleDateString()}</Text>
              </View>
              <View style={{ width: "40%", borderBottom: `1 solid ${DARK_TEXT}`, paddingBottom: 10 }}>
                 {/* Only embed standard URLs, base64 data urls handled directly */}
                 {profile?.signature_url && <Image src={profile.signature_url} style={{ height: 60, objectFit: "contain", marginBottom: 10 }} />}
                 <Text style={{ fontSize: 14, fontWeight: "bold", marginTop: profile?.signature_url ? 0 : 70 }}>{profile?.owner_name || "Owner"}</Text>
                 <Text style={{ fontSize: 10, color: MUTED_TEXT }}>{profile?.business_name}</Text>
              </View>
           </View>
        </Page>
      )}

      {/* 13. Contact Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverHeaderRow}>
            <Text style={styles.coverCompany}>{profile?.business_name || "Studio"}</Text>
            <Text style={styles.coverDate}>{formattedDate}</Text>
          </View>
          <View style={{ marginTop: "auto" }}>
            <Text style={{ fontSize: 64, fontWeight: "bold", color: brandPrimary, lineHeight: 1.1 }}>Let's Work</Text>
            <Text style={{ fontSize: 64, fontWeight: "bold", color: brandPrimary, lineHeight: 1.1 }}>Together ↗</Text>
          </View>
        </View>
        <View style={{ ...styles.coverBottom, flexDirection: "column", alignItems: "flex-start" }}>
          <Text style={{ color: WHITE, fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>Contact Us</Text>
          {profile?.phone && <Text style={{ color: WHITE, fontSize: 14, marginBottom: 10 }}>📞 {profile.phone}</Text>}
          {profile?.email && <Text style={{ color: WHITE, fontSize: 14, marginBottom: 10 }}>✉ {profile.email}</Text>}
          {profile?.website && <Text style={{ color: WHITE, fontSize: 14, marginBottom: 10 }}>🌐 {profile.website}</Text>}
        </View>
      </Page>
    </Document>
  );

  return await renderToStream(ProposalDocument).then(
    (stream) =>
      new Promise<Uint8Array>((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => {
          let totalLength = 0;
          for (const chunk of chunks) totalLength += chunk.length;
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(result);
        });
        stream.on("error", reject);
      })
  );
}
