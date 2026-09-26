import React from 'react';
import { Card, CardContent } from './ui/Card';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const EmailResultsDisplay = ({ result }: { result: any }) => {
  if (!result) return null;

  const mb = result.mathematical_breakdown || {};
  const isPhishing = result.status?.toLowerCase() === 'phishing';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* 1. EMAIL TEXT ANALYSIS & MATHEMATICS */}
      <Card className="border-border bg-card/50 backdrop-blur-xl shadow-lg">
        <CardContent className="p-8 space-y-8">
          <div className="border-b-2 border-primary/20 pb-4 mb-6">
            <h3 className="font-mono text-xl font-bold tracking-widest text-primary uppercase text-center">
              Email Text Analysis & Mathematics
            </h3>
          </div>

          {mb.formula && (
            <div className="font-mono text-sm text-foreground bg-muted/20 p-4 rounded-md border border-border/50 text-center">
              <span className="text-muted-foreground">Formula:</span> {mb.formula}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 p-6 bg-muted/10 rounded-md border border-border/50 max-w-2xl mx-auto">
            <div className="font-mono text-sm text-muted-foreground font-semibold">Base NLP Prediction:</div>
            <div className={`font-mono text-sm font-bold ${isPhishing ? 'text-destructive' : 'text-emerald-500'}`}>
              {mb.baseline_nlp_prediction?.toUpperCase() || result.status?.toUpperCase()}
            </div>
            <div className="font-mono text-sm text-muted-foreground font-semibold">Policy Override:</div>
            <div className="font-mono text-sm text-foreground font-bold">
              {mb.security_policy_override ? 'YES' : 'NO'}
            </div>
          </div>

          {/* Dual-Engine Class Probabilities */}
          <div className="space-y-3">
            <h4 className="font-mono text-base font-bold text-primary">Dual-Engine Class Probabilities</h4>
            <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
              <table className="w-full text-sm font-mono text-left border-collapse">
                <thead className="bg-muted/40 border-b-2 border-border/60">
                  <tr className="text-muted-foreground">
                    <th className="py-3 px-4">Engine</th>
                    <th className="py-3 px-4">Probabilities</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4">Legacy Engine ({mb.ensemble_weights?.legacy * 100 || 40}%)</td>
                    <td className="py-3 px-4 text-foreground">
                      {mb.engine_breakdown?.legacy ? 
                        Object.entries(mb.engine_breakdown.legacy).map(([k,v]) => `${k}: ${v}%`).join(', ') : 'N/A'}
                    </td>
                  </tr>
                  <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4">Modern Engine ({mb.ensemble_weights?.modern * 100 || 60}%)</td>
                    <td className="py-3 px-4 text-foreground">
                      {mb.engine_breakdown?.modern ? 
                        Object.entries(mb.engine_breakdown.modern).map(([k,v]) => `${k}: ${v}%`).join(', ') : 'N/A'}
                    </td>
                  </tr>
                  <tr className="bg-muted/10">
                    <td className="py-3 px-4 text-foreground font-bold">Final Class Probs</td>
                    <td className="py-3 px-4 text-primary font-bold">
                      {result.class_probabilities ? 
                        Object.entries(result.class_probabilities).map(([k,v]) => `${k}: ${v}%`).join(', ') : 'N/A'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Adversarial Metrics */}
          {result.adversarial_defense && (
            <div className="space-y-3">
              <h4 className="font-mono text-base font-bold text-primary">Adversarial Metrics</h4>
              <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
                <table className="w-full text-sm font-mono text-left border-collapse">
                  <thead className="bg-muted/40 border-b-2 border-border/60">
                    <tr className="text-muted-foreground">
                      <th className="py-3 px-4">Metric</th>
                      <th className="py-3 px-4">Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-semibold">Homoglyphs Normalized</td>
                      <td className={`py-3 px-4 font-bold ${result.adversarial_defense.homoglyphs_normalized ? 'text-destructive' : 'text-emerald-500'}`}>
                        {result.adversarial_defense.homoglyphs_normalized ? 'True' : 'False'}
                      </td>
                    </tr>
                    <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-semibold">Zero-Width Chars</td>
                      <td className="py-3 px-4 text-foreground">{result.adversarial_defense.zero_width_chars_removed || 0}</td>
                    </tr>
                    <tr className="bg-muted/10">
                      <td className="py-3 px-4 text-foreground font-bold">Evasion Detected</td>
                      <td className={`py-3 px-4 font-bold ${result.adversarial_defense.evasion_detected ? 'text-destructive' : 'text-emerald-500'}`}>
                        {result.adversarial_defense.evasion_detected ? 'YES' : 'NO'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Explainable AI */}
          {result.explainable_ai && result.explainable_ai.length > 0 && (
            <div className="space-y-3 mt-8">
              <h4 className="font-mono text-base font-bold text-primary">Explainable AI (Why the Model Flagged This Email)</h4>
              <div className="rounded-md border border-border/50 overflow-x-auto shadow-sm">
                <table className="w-full text-sm font-mono text-left border-collapse whitespace-nowrap">
                  <thead className="bg-muted/40 border-b-2 border-border/60">
                    <tr className="text-muted-foreground">
                      <th className="py-3 px-4">No.</th>
                      <th className="py-3 px-4">Token</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Influence</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {result.explainable_ai.map((xai: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4">{idx + 1}</td>
                        <td className="py-3 px-4 text-foreground font-bold">"{xai.token}"</td>
                        <td className="py-3 px-4">{xai.location}</td>
                        <td className="py-3 px-4 whitespace-normal">{xai.reason}</td>
                        <td className="py-3 px-4 font-bold text-destructive">{xai.influence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* Extracted Features */}
            {result.extracted_features && (
              <div className="space-y-3">
                <h4 className="font-mono text-base font-bold text-primary">Extracted Email Features</h4>
                <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
                  <table className="w-full text-sm font-mono text-left border-collapse">
                    <thead className="bg-muted/40 border-b-2 border-border/60">
                      <tr className="text-muted-foreground">
                        <th className="py-3 px-4">Feature</th>
                        <th className="py-3 px-4">Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      {Object.entries(result.extracted_features).slice(0, 5).map(([k, v]: [string, any], i) => (
                        <tr key={i} className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 capitalize font-semibold">{k.replace('_', ' ')}</td>
                          <td className="py-3 px-4 text-foreground">{Number(v).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Voting Weights & SVM Margin */}
            <div className="space-y-3">
              <h4 className="font-mono text-base font-bold text-primary">Voting Weights & SVM Margin</h4>
              <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
                <table className="w-full text-sm font-mono text-left border-collapse">
                  <thead className="bg-muted/40 border-b-2 border-border/60">
                    <tr className="text-muted-foreground">
                      <th className="py-3 px-4">Metric</th>
                      <th className="py-3 px-4">Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-semibold">Legacy Engine Weight</td>
                      <td className="py-3 px-4 text-foreground">{mb.ensemble_weights?.legacy * 100 || 40}%</td>
                    </tr>
                    <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-semibold">Modern Engine Weight</td>
                      <td className="py-3 px-4 text-foreground">{mb.ensemble_weights?.modern * 100 || 60}%</td>
                    </tr>
                    <tr className="bg-muted/10">
                      <td className="py-3 px-4 text-foreground font-bold">Raw SVM Margin f(x)</td>
                      <td className="py-3 px-4 text-foreground font-bold">{mb.raw_margin_f_x ? mb.raw_margin_f_x.toFixed(3) : 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Step-by-Step Mathematics & Decision Process */}
          {mb.step_by_step && mb.step_by_step.length > 0 && (
            <div className="space-y-4 mt-8">
              <h4 className="font-mono text-base font-bold text-primary">Step-by-Step Mathematics & Decision Process</h4>
              <div className="bg-muted/10 border border-border/50 rounded-md p-6">
                <ul className="space-y-3 text-sm text-muted-foreground font-mono">
                  {mb.step_by_step.map((step: string, i: number) => (
                    <li key={i} className="flex gap-4">
                      <span className="text-border whitespace-nowrap">├──</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Email Threat Explanation & Key Factors */}
          {result.analysis_summary && (
            <div className="space-y-3 mt-8">
              <h4 className="font-mono text-base font-bold text-primary text-center">Email Threat Explanation & Key Factors</h4>
              <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
                <table className="w-full text-sm font-mono text-left border-collapse">
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/20 even:bg-muted/5">
                      <td className="py-4 px-6 font-bold text-foreground align-top w-1/4">Headline</td>
                      <td className="py-4 px-6 text-foreground font-semibold">{result.analysis_summary.headline}</td>
                    </tr>
                    <tr className="border-b border-border/20 even:bg-muted/5">
                      <td className="py-4 px-6 font-bold text-foreground align-top">Explanation</td>
                      <td className="py-4 px-6 leading-relaxed">{result.analysis_summary.explanation}</td>
                    </tr>
                    {result.analysis_summary.key_factors && (
                      <tr className="bg-muted/5">
                        <td className="py-4 px-6 font-bold text-foreground align-top">Key Risk Factors</td>
                        <td className="py-4 px-6">
                          <ul className="space-y-2 list-disc list-inside">
                            {result.analysis_summary.key_factors.map((factor: string, i: number) => (
                              <li key={i} className="leading-relaxed">{factor}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. URL THREAT ENGINE ANALYSIS (IF PRESENT) */}
      {result.detailed_url_analysis && result.detailed_url_analysis.length > 0 && (
        <div className="space-y-8">
          {result.detailed_url_analysis.map((urlData: any, index: number) => (
            <Card key={index} className="border-border bg-card/50 backdrop-blur-xl shadow-lg">
              <CardContent className="p-8 space-y-8">
                <div className="border-b-2 border-primary/20 pb-4 mb-6">
                  <h3 className="font-mono text-xl font-bold tracking-widest text-primary uppercase text-center">
                    URL Threat Engine Analysis & Mathematics
                  </h3>
                </div>

                <div className="font-mono text-sm text-foreground bg-muted/20 p-4 rounded-md border border-border/50 text-center">
                  <span className="text-muted-foreground">Formula:</span> P(k) = e^(z_k) / Sum(e^(z_j)) (Softmax Normalization)
                </div>

                <div className="text-center font-mono text-base text-primary font-bold break-all p-4 border border-primary/20 rounded-md bg-primary/5">
                  URL: <span className="text-foreground">{urlData.url}</span>
                </div>

                {urlData.mathematical_breakdown && (
                  <div className="overflow-x-auto mt-6">
                    <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
                      <table className="w-full text-sm font-mono text-left border-collapse">
                        <thead className="bg-muted/40 border-b-2 border-border/60">
                          <tr className="text-muted-foreground">
                            <th className="py-3 px-6 w-1/4">Metric</th>
                            <th className="py-3 px-6">Value</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-6 font-bold text-foreground">Status</td>
                            <td className={`py-3 px-6 font-bold text-base ${urlData.status === 'PHISHING' ? 'text-destructive' : 'text-emerald-500'}`}>
                              {urlData.status}
                            </td>
                          </tr>
                          <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-6 font-bold text-foreground">Class Probabilities</td>
                            <td className="py-3 px-6 text-foreground">
                              {urlData.class_probabilities ? 
                                Object.entries(urlData.class_probabilities).map(([k,v]) => `${k}: ${v}%`).join(', ') : 'N/A'}
                            </td>
                          </tr>
                          <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-6 font-bold text-foreground">Logits</td>
                            <td className="py-3 px-6 text-foreground break-all">
                              {urlData.mathematical_breakdown.raw_logits_z ? 
                                JSON.stringify(urlData.mathematical_breakdown.raw_logits_z).replace(/"/g, "'") : 'N/A'}
                            </td>
                          </tr>
                          <tr className="border-b border-border/20 even:bg-muted/5 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-6 font-bold text-foreground">Exponentials</td>
                            <td className="py-3 px-6 text-foreground break-all">
                              {urlData.mathematical_breakdown.exponentials_exp_z ? 
                                JSON.stringify(urlData.mathematical_breakdown.exponentials_exp_z).replace(/"/g, "'") : 'N/A'}
                            </td>
                          </tr>
                          <tr className="bg-muted/10">
                            <td className="py-3 px-6 font-bold text-foreground">Sum Denominator</td>
                            <td className="py-3 px-6 text-foreground font-bold">{urlData.mathematical_breakdown.sum_denominator?.toFixed(3) || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Softmax Step-by-Step */}
                {urlData.mathematical_breakdown?.step_by_step && (
                  <div className="space-y-4 mt-8">
                    <h4 className="font-mono text-base font-bold text-primary">Softmax Step-by-Step</h4>
                    <div className="bg-muted/10 border border-border/50 rounded-md p-6">
                      <ul className="space-y-3 text-sm text-muted-foreground font-mono">
                        {urlData.mathematical_breakdown.step_by_step.map((step: string, i: number) => (
                          <li key={i} className="flex gap-4">
                            <span className="text-border whitespace-nowrap">├──</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* URL Threat Explanation & Key Factors */}
                {urlData.analysis_summary && (
                  <div className="space-y-3 mt-8">
                    <h4 className="font-mono text-base font-bold text-primary text-center">URL Threat Explanation & Key Factors</h4>
                    <div className="rounded-md border border-border/50 overflow-hidden shadow-sm">
                      <table className="w-full text-sm font-mono text-left border-collapse">
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/20 even:bg-muted/5">
                            <td className="py-4 px-6 font-bold text-foreground align-top w-1/4">Headline</td>
                            <td className="py-4 px-6 text-foreground font-semibold">{urlData.analysis_summary.headline}</td>
                          </tr>
                          <tr className="border-b border-border/20 even:bg-muted/5">
                            <td className="py-4 px-6 font-bold text-foreground align-top">Explanation</td>
                            <td className="py-4 px-6 leading-relaxed">{urlData.analysis_summary.explanation}</td>
                          </tr>
                          {urlData.analysis_summary.key_factors && (
                            <tr className="bg-muted/5">
                              <td className="py-4 px-6 font-bold text-foreground align-top">Key Risk Factors</td>
                              <td className="py-4 px-6">
                                <ul className="space-y-2 list-disc list-inside">
                                  {urlData.analysis_summary.key_factors.map((factor: string, i: number) => (
                                    <li key={i} className="leading-relaxed">{factor}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 3. FINAL VERDICT */}
      <Card className={`border-2 ${isPhishing ? 'border-destructive' : 'border-emerald-500'} bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden mt-12`}>
        <div className={`p-2 ${isPhishing ? 'bg-destructive' : 'bg-emerald-500'}`}></div>
        <CardContent className="p-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-6 rounded-full bg-background shadow-lg border border-border mb-4">
            {isPhishing ? 
              <ShieldAlert className="w-16 h-16 text-destructive" /> : 
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            }
          </div>
          <h2 className="text-5xl font-black uppercase tracking-widest text-foreground">
            {result.status}
          </h2>
          <div className="flex justify-center gap-12 font-mono mt-8">
            <div className="bg-background/50 border border-border/50 rounded-lg p-6 min-w-[160px]">
              <div className="text-muted-foreground uppercase tracking-widest text-xs font-bold mb-2">Confidence</div>
              <div className="text-foreground text-3xl font-black">{result.confidence}%</div>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-lg p-6 min-w-[160px]">
              <div className="text-muted-foreground uppercase tracking-widest text-xs font-bold mb-2">Risk Level</div>
              <div className={`text-3xl font-black uppercase ${isPhishing ? 'text-destructive' : 'text-emerald-500'}`}>
                {result.risk}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
