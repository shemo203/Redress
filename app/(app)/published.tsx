import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "../../src/constants";
import { supabase } from "../../src/lib/supabaseClient";

type PublishedPost = {
  caption: string;
  created_at: string;
  creator_id: string;
  id: string;
  video_url: string;
};

export default function PublishedPostsScreen() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadPublishedPosts = async () => {
    setIsLoading(true);
    setStatusMessage(null);

    const { data, error } = await supabase
      .from("video_posts")
      .select("id, caption, creator_id, created_at, video_url")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setStatusMessage(`Failed to load published posts: ${error.message}`);
      return;
    }

    setPosts(data ?? []);
  };

  useEffect(() => {
    void loadPublishedPosts();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Published posts</Text>

      <Pressable onPress={loadPublishedPosts} style={styles.reloadButton}>
        <Text style={styles.reloadButtonText}>
          {isLoading ? "Loading..." : "Reload"}
        </Text>
      </Pressable>

      {statusMessage ? <Text style={styles.errorText}>{statusMessage}</Text> : null}

      {!isLoading && posts.length === 0 ? (
        <Text style={styles.emptyText}>No published posts yet.</Text>
      ) : null}

      {posts.map((post) => (
        <View key={post.id} style={styles.row}>
          <Text style={styles.caption}>{post.caption || "(no caption)"}</Text>
          <Text style={styles.meta}>Creator: {post.creator_id}</Text>
          <Text style={styles.meta}>Created: {post.created_at}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: theme.color.ink,
    fontSize: 16,
    fontFamily: "serif",
    fontWeight: "700",
  },
  container: {
    backgroundColor: theme.color.bg,
    padding: 16,
  },
  emptyText: {
    color: theme.color.muted,
    marginTop: 16,
  },
  errorText: {
    color: theme.color.danger,
    marginTop: 12,
  },
  meta: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  reloadButton: {
    alignItems: "center",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    marginBottom: 12,
    marginTop: 8,
    paddingVertical: 10,
    ...theme.shadow.card,
  },
  reloadButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  row: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
    ...theme.shadow.card,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
  },
});
