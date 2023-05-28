import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExcerpt } from "@/lib/blog";
import { revalidatePath } from "next/cache";

export async function POST(request) {
  const { token, ...res } = await request.json();
  if (process.EDIT_TOKEN && token !== process.EDIT_TOKEN) {
    return NextResponse.json(
      { error: "Invalid token specified." },
      { status: 403 }
    );
  }

  if (!res.editToken && (!res.title || !res.content || !res.html || !res.id)) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  if (res.html) {
    res.excerpt = getExcerpt({ description: res.html || res.content });
  }

  try {
    let editToken;
    if (res.editToken) {
      await db
        .updateTable("posts")
        .set(res)
        .where("editToken", "=", res.editToken)
        .execute();
      editToken = res.editToken;
    } else {
      editToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      await db
        .insertInto("posts")
        .values({
          ...res,
          editToken,
        })
        .executeTakeFirst();
    }

    revalidatePath("/");
    revalidatePath("/posts");
    revalidatePath("/api/rss.xml");
    revalidatePath(`/${res.id}`);

    return NextResponse.json({
      id: res.id,
      url: `https://schof.co/${res.id}`,
      editToken,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: `Something went wrong: ${e.message}` },
      { status: 400 }
    );
  }
}
