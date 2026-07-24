import React, { useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowRight, Save, FileText, Hash, Calendar,
  Upload, Paperclip, CheckCircle2, X, MailOpen, Send,
} from "lucide-react";
import {
  useGetDocument,
  getGetDocumentQueryKey,
  useCreateDocument,
  useUpdateDocument,
  useGetNextDocumentNumber,
  getGetNextDocumentNumberQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ku: React.CSSProperties = { fontFamily: "'Noto Kufi Arabic', sans-serif" };

const statusOptions = ["نوێ", "لە پێداچوونەوەدایە", "پەسەندکراوە", "ڕەتکراوەتەوە", "کۆتاییهاتووە"];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const directionOptions = [
  { value: "هاتوو", label: "نوسراوی هاتوو", icon: MailOpen },
  { value: "ڕۆشتوو", label: "نوسراوی ڕۆشتوو", icon: Send },
] as const;

const createSchema = z.object({
  document_number: z.string().min(1, "ژمارەی نوسراو پێویستە").max(100),
  document_date: z.string().min(1, "بەرواری نوسراو پێویستە"),
  subject: z.string().min(1, "بابەت پێویستە").max(255),
  current_status: z.string().min(1),
  direction: z.enum(["هاتوو", "ڕۆشتوو"]),
  attachment: z
    .instanceof(File, { message: "فایلێک هەڵبژێرە" })
    .refine(
      (f) => ALLOWED_MIME_TYPES.includes(f.type),
      "تەنها فایلی PDF، Word (.doc/.docx) و وێنە (.jpg/.png) قبووڵدەکرێن"
    )
    .refine((f) => f.size <= 20 * 1024 * 1024, "فایلەکە دەبێت کەمتر لە ٢٠ مێگابایت بێت"),
});

const editSchema = z.object({
  document_number: z.string().min(1, "ژمارەی نوسراو پێویستە").max(100),
  document_date: z.string().min(1, "بەرواری نوسراو پێویستە"),
  subject: z.string().min(1, "بابەت پێویستە").max(255),
  current_status: z.string().min(1),
  direction: z.enum(["هاتوو", "ڕۆشتوو"]),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentForm() {
  const [matchNew] = useRoute("/documents/new");
  const [, editParams] = useRoute("/documents/:id/edit");
  const isNew = !!matchNew;
  const documentId = !isNew && editParams?.id ? Number(editParams.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const { data: document, isLoading: loadingDoc } = useGetDocument(documentId as number, {
    query: { enabled: !!documentId, queryKey: getGetDocumentQueryKey(documentId as number) },
  });

  const { data: nextNumberData } = useGetNextDocumentNumber({
    query: { queryKey: getGetNextDocumentNumberQueryKey(), enabled: isNew },
  });

  const createMutation = useCreateDocument({
    mutation: {
      onSuccess: () => {
        toast({ title: "نوسراوەکە بە سەرکەوتوویی زیادکرا." });
        setLocation("/documents");
      },
      onError: (err: any) => {
        toast({ title: "هەڵە لە دروستکردن", description: err.message, variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateDocument({
    mutation: {
      onSuccess: () => {
        toast({ title: "نوسراوەکە بە سەرکەوتوویی نوێکرایەوە." });
        setLocation(`/documents/${documentId}`);
      },
      onError: (err: any) => {
        toast({ title: "هەڵە لە نوێکردنەوە", description: err.message, variant: "destructive" });
      },
    },
  });

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      document_number: "",
      document_date: new Date().toISOString().slice(0, 10),
      subject: "",
      current_status: "نوێ",
      direction: "هاتوو",
    },
  });

  React.useEffect(() => {
    if (isNew && nextNumberData?.next_number && !createForm.getValues("document_number")) {
      createForm.setValue("document_number", nextNumberData.next_number);
    }
  }, [isNew, nextNumberData, createForm]);

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      document_number: "",
      document_date: new Date().toISOString().slice(0, 10),
      subject: "",
      current_status: "نوێ",
      direction: "هاتوو",
    },
    values: document
      ? {
          document_number: document.document_number,
          document_date: document.document_date.slice(0, 10),
          subject: document.subject,
          current_status: document.current_status,
          direction: (document.direction as "هاتوو" | "ڕۆشتوو") ?? "هاتوو",
        }
      : undefined,
  });

  const onCreateSubmit = (values: CreateFormValues) => {
    createMutation.mutate({
      data: {
        document_number: values.document_number,
        document_date: values.document_date,
        subject: values.subject,
        current_status: values.current_status,
        direction: values.direction,
        attachment: values.attachment,
      },
    });
  };

  const onEditSubmit = (values: EditFormValues) => {
    updateMutation.mutate({
      id: documentId as number,
      data: { ...values, document_date: new Date(values.document_date) as any },
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && loadingDoc) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Shared field renderers ─────────────────────────────────
  function DocNumberField({ control }: { control: any }) {
    return (
      <FormField
        control={control}
        name="document_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
              <Hash className="h-3 w-3" /> ژمارەی نوسراو
            </FormLabel>
            <FormControl>
              <Input className="text-right rounded-xl h-10 bg-background border-border/70" style={ku} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function DocDateField({ control }: { control: any }) {
    return (
      <FormField
        control={control}
        name="document_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
              <Calendar className="h-3 w-3" /> بەروار
            </FormLabel>
            <FormControl>
              <Input type="date" className="text-right rounded-xl h-10 bg-background border-border/70" style={ku} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function SubjectField({ control }: { control: any }) {
    return (
      <FormField
        control={control}
        name="subject"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
              <FileText className="h-3 w-3" /> بابەت
            </FormLabel>
            <FormControl>
              <Input className="text-right rounded-xl h-10 bg-background border-border/70" style={ku} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function DirectionField({ control }: { control: any }) {
    return (
      <FormField
        control={control}
        name="direction"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>جۆری نوسراو</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-3">
                {directionOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = field.value === value;
                  const isIncoming = value === "هاتوو";
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                        isSelected
                          ? isIncoming
                            ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                            : "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                      style={ku}
                    >
                      <div className={`rounded-lg p-1.5 ${isSelected ? (isIncoming ? "bg-sky-500/15" : "bg-violet-500/15") : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${isSelected ? (isIncoming ? "text-sky-600" : "text-violet-600") : "text-muted-foreground"}`} />
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function StatusField({ control }: { control: any }) {
    return (
      <FormField
        control={control}
        name="current_status"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>دۆخ</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl h-10 bg-background border-border/70" style={ku}>
                  <SelectValue placeholder="دۆخ هەڵبژێرە" />
                </SelectTrigger>
              </FormControl>
              <SelectContent style={ku}>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // ── Create mode ───────────────────────────────────────────
  if (isNew) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6" dir="rtl" style={ku}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-xl h-9 w-9">
            <Link href="/documents">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">نوسراوی نوێ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">زانیاریەکان پڕبکەوە بۆ زیادکردنی نوسراوی نوێ</p>
          </div>
        </div>

        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
            <Card className="rounded-2xl shadow-sm border-border/70">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2" style={ku}>
                  <div className="rounded-lg bg-violet-500/10 p-1.5">
                    <FileText className="h-4 w-4 text-violet-600" />
                  </div>
                  زانیاری نوسراو
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DirectionField control={createForm.control} />
                <DocNumberField control={createForm.control} />
                <DocDateField control={createForm.control} />
                <SubjectField control={createForm.control} />
                <StatusField control={createForm.control} />

                {/* Upload zone */}
                <FormField
                  control={createForm.control}
                  name="attachment"
                  render={({ field: { onChange } }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" style={ku}>
                        <Paperclip className="h-3 w-3" /> هاوپێچ
                      </FormLabel>
                      <FormControl>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) { onChange(file); setSelectedFile(file); }
                            }}
                          />
                          {selectedFile ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3.5">
                              <div className="rounded-xl bg-emerald-500/10 p-2 shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-semibold text-emerald-700 truncate">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(selectedFile.size)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSelectedFile(null); onChange(undefined); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full rounded-2xl border-2 border-dashed border-border hover:border-violet-400 hover:bg-violet-500/5 transition-all duration-200 py-8 px-4 text-center group"
                            >
                              <div className="flex flex-col items-center gap-2.5">
                                <div className="rounded-2xl bg-muted p-3 group-hover:bg-violet-500/10 transition-colors">
                                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-violet-600 transition-colors" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground" style={ku}>
                                    کلیک بکە بۆ هەڵبژاردنی هاوپێچ
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1" style={ku}>
                                    PDF، Word (.doc/.docx)، وێنە (.jpg/.png) — زۆرترین قەبارە: ٢٠ مێگابایت
                                  </p>
                                </div>
                              </div>
                            </button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-start gap-3 pb-12">
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[130px] rounded-xl bg-violet-600 hover:bg-violet-700 h-10"
                style={ku}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    چاوەڕێ بکە...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    پاشەکەوتکردن
                  </span>
                )}
              </Button>
              <Button type="button" variant="outline" asChild className="rounded-xl h-10 border-border/70" style={ku}>
                <Link href="/documents">پاشگەزبوونەوە</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6" dir="rtl" style={ku}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-9 w-9">
          <Link href={`/documents/${documentId}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">دەستکاریکردنی نوسراو</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{document?.document_number}</p>
        </div>
      </div>

      <Form {...editForm}>
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
          <Card className="rounded-2xl shadow-sm border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2" style={ku}>
                <div className="rounded-lg bg-violet-500/10 p-1.5">
                  <FileText className="h-4 w-4 text-violet-600" />
                </div>
                زانیاری نوسراو
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DirectionField control={editForm.control} />
              <DocNumberField control={editForm.control} />
              <DocDateField control={editForm.control} />
              <SubjectField control={editForm.control} />
              <StatusField control={editForm.control} />

              {document?.file_path && (
                <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="rounded-lg bg-muted p-1.5 shrink-0">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground" style={ku}>فایلی هاوپێچکراو:</span>
                  <a
                    href={`/api/documents/uploads/${document.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-600 hover:text-violet-700 hover:underline underline-offset-2 truncate font-medium"
                    style={ku}
                  >
                    بینینی فایل
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-start gap-3 pb-12">
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[130px] rounded-xl bg-violet-600 hover:bg-violet-700 h-10"
              style={ku}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  چاوەڕێ بکە...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  پاشەکەوتکردن
                </span>
              )}
            </Button>
            <Button type="button" variant="outline" asChild className="rounded-xl h-10 border-border/70" style={ku}>
              <Link href={`/documents/${documentId}`}>پاشگەزبوونەوە</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
