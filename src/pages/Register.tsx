import { registerSchema, type RegisterSchema } from "@/lib/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TFieldError from "@/components/TFieldError";
import { errorText } from "@/lib/errorText";
import { supabase } from "@/lib/supabaseClient";

const Register = () => {
    const { t } = useTranslation();
    const { handleSubmit, control, reset } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            displayName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const signUpMutation = useMutation({
        mutationFn: async ({ displayName, email, password }: RegisterSchema) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { display_name: displayName } },
            });
            if (error) throw error;

            // Confirm-email ON: a duplicate email returns no error, but identities is empty
            if (data.user?.identities?.length === 0) {
                throw new Error("errors.emailTaken");
            }
            return data;
        },
    });

    const onSubmit = (data: RegisterSchema) => {
        signUpMutation.mutate(data);
    };

    // Only true when "Confirm email" is ON in Supabase: user created, no session yet
    const needsEmailConfirm =
        signUpMutation.isSuccess && !signUpMutation.data.session;

    const textField = (
        name: "displayName" | "email" | "password" | "confirmPassword",
        id: string,
        label: string,
        props: { type?: string; placeholder?: string; autoComplete: string },
    ) => (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={id}>{label}</FieldLabel>
                    <Input
                        {...field}
                        id={id}
                        type={props.type}
                        aria-invalid={fieldState.invalid}
                        placeholder={props.placeholder}
                        autoComplete={props.autoComplete}
                    />
                    <TFieldError error={fieldState.error} />
                </Field>
            )}
        />
    );

    return (
        <main
            id="main-content"
            className="flex min-h-screen items-center justify-center p-4"
        >
            <div className="w-full sm:max-w-md">
                <div className="mb-2 flex justify-end">
                    <LanguageSwitcher />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <h1>{t("auth.registerTitle")}</h1>
                        </CardTitle>
                        <CardDescription>{t("auth.registerDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {signUpMutation.isError && (
                            <p
                                role="alert"
                                className="mb-4 text-sm font-medium text-destructive"
                            >
                                {errorText(t, signUpMutation.error)}
                            </p>
                        )}
                        {needsEmailConfirm && (
                            <p role="status" className="mb-4 text-sm text-muted-foreground">
                                {t("auth.checkEmail")}
                            </p>
                        )}

                        <form id="register-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                            <FieldGroup>
                                {textField("displayName", "register-displayName", t("auth.displayName"), {
                                    placeholder: "John Doe",
                                    autoComplete: "name",
                                })}
                                {textField("email", "register-email", t("auth.email"), {
                                    type: "email",
                                    placeholder: "example@mail.com",
                                    autoComplete: "email",
                                })}
                                {textField("password", "register-password", t("auth.password"), {
                                    type: "password",
                                    placeholder: "••••••••",
                                    autoComplete: "new-password",
                                })}
                                {textField(
                                    "confirmPassword",
                                    "register-confirmPassword",
                                    t("auth.confirmPassword"),
                                    {
                                        type: "password",
                                        placeholder: "••••••••",
                                        autoComplete: "new-password",
                                    },
                                )}
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Field orientation="horizontal">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={signUpMutation.isPending}
                                onClick={() => {
                                    reset();
                                    signUpMutation.reset();
                                }}
                            >
                                {t("common.reset")}
                            </Button>
                            <Button
                                type="submit"
                                form="register-form"
                                className="flex-1 sm:flex-none"
                                disabled={signUpMutation.isPending}
                            >
                                {signUpMutation.isPending
                                    ? t("auth.creatingAccount")
                                    : t("auth.register")}
                            </Button>
                        </Field>
                        <p className="text-sm text-muted-foreground">
                            {t("auth.haveAccount")}{" "}
                            <Link
                                to="/login"
                                className="font-medium text-foreground underline underline-offset-4"
                            >
                                {t("auth.loginLink")}
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </main>
    );
};

export default Register;
