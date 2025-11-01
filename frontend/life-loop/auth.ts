import NextAuth from "next-auth";
import Instagram from "next-auth/providers/instagram";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Instagram({
      clientId: process.env.AUTH_INSTAGRAM_ID,
      clientSecret: process.env.AUTH_INSTAGRAM_SECRET,
    }),
  ],
});

