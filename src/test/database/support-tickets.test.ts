import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// These tests require a running Supabase instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-key";

const supabase = createClient(supabaseUrl, supabaseKey);

describe.skip("Support Tickets Database Integration", () => {
  // Skip if no database connection
  const hasDbConnection = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeAll(async () => {
    if (!hasDbConnection) return;
    
    // Clean up test data
    await supabase.from("support_ticket_events").delete().neq("id", "0");
    await supabase.from("support_ticket_comments").delete().neq("id", "0");
    await supabase.from("support_tickets").delete().neq("id", "0");
  });

  beforeEach(async () => {
    if (!hasDbConnection) return;
    
    // Clean up before each test
    await supabase.from("support_ticket_events").delete().neq("id", "0");
    await supabase.from("support_ticket_comments").delete().neq("id", "0");
    await supabase.from("support_tickets").delete().neq("id", "0");
  });

  afterAll(async () => {
    if (!hasDbConnection) return;
    
    // Final cleanup
    await supabase.from("support_ticket_events").delete().neq("id", "0");
    await supabase.from("support_ticket_comments").delete().neq("id", "0");
    await supabase.from("support_tickets").delete().neq("id", "0");
  });

  describe("support_tickets table", () => {
    it("should create a ticket with auto-generated ticket number", async () => {
      if (!hasDbConnection) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          user_name: "Test User",
          subject: "Test Subject",
          description: "Test Description",
          category: "technical",
          status: "open",
          priority: "medium",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data.ticket_number).toBeDefined();
      expect(data.ticket_number).toBeGreaterThan(0);
    });

    it("should auto-calculate priority based on keywords", async () => {
      if (!hasDbConnection) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "URGENT: System is down",
          description: "Critical outage affecting all users",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.priority).toBe("urgent");
    });

    it("should calculate SLA deadline based on priority", async () => {
      if (!hasDbConnection) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
          priority: "urgent",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.sla_deadline).toBeDefined();
      
      // SLA deadline should be in the future
      const slaDate = new Date(data.sla_deadline);
      const now = new Date();
      expect(slaDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should enforce valid status values", async () => {
      if (!hasDbConnection) return;

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "invalid_status",
        });

      expect(error).not.toBeNull();
    });

    it("should enforce valid priority values", async () => {
      if (!hasDbConnection) return;

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
          priority: "invalid_priority",
        });

      expect(error).not.toBeNull();
    });

    it("should enforce valid category values", async () => {
      if (!hasDbConnection) return;

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "invalid_category",
          status: "open",
        });

      expect(error).not.toBeNull();
    });

    it("should soft delete tickets", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: created } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "To be deleted",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Soft delete
      const { error: deleteError } = await supabase
        .from("support_tickets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", created.id);

      expect(deleteError).toBeNull();

      // Should not appear in normal queries
      const { data: found } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", created.id)
        .is("deleted_at", null)
        .single();

      expect(found).toBeNull();
    });
  });

  describe("support_ticket_comments table", () => {
    it("should create a comment linked to a ticket", async () => {
      if (!hasDbConnection) return;

      // Create ticket first
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Create comment
      const { data: comment, error } = await supabase
        .from("support_ticket_comments")
        .insert({
          ticket_id: ticket.id,
          author_id: "agent_123",
          author_email: "agent@example.com",
          author_name: "Agent",
          is_agent: true,
          is_internal: false,
          content: "Test comment",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(comment.ticket_id).toBe(ticket.id);
    });

    it("should support internal notes", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Create internal comment
      const { data: comment, error } = await supabase
        .from("support_ticket_comments")
        .insert({
          ticket_id: ticket.id,
          author_id: "agent_123",
          author_email: "agent@example.com",
          author_name: "Agent",
          is_agent: true,
          is_internal: true,
          content: "Internal note",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(comment.is_internal).toBe(true);
    });

    it("should support attachments in comments", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Create comment with attachments
      const attachments = [
        {
          filename: "screenshot.png",
          url: "https://example.com/file.png",
          mimeType: "image/png",
          size: 1024,
        },
      ];

      const { data: comment, error } = await supabase
        .from("support_ticket_comments")
        .insert({
          ticket_id: ticket.id,
          author_id: "user_test_123",
          author_email: "test@example.com",
          is_agent: false,
          is_internal: false,
          content: "See attached screenshot",
          attachments,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(comment.attachments).toHaveLength(1);
      expect(comment.attachments[0].filename).toBe("screenshot.png");
    });
  });

  describe("support_ticket_events table", () => {
    it("should create events linked to tickets", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Create event
      const { data: event, error } = await supabase
        .from("support_ticket_events")
        .insert({
          ticket_id: ticket.id,
          event_type: "status_changed",
          old_value: "open",
          new_value: "in_progress",
          performed_by: "agent_123",
          performed_by_email: "agent@example.com",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(event.ticket_id).toBe(ticket.id);
      expect(event.event_type).toBe("status_changed");
    });

    it("should enforce valid event types", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Try invalid event type
      const { error } = await supabase
        .from("support_ticket_events")
        .insert({
          ticket_id: ticket.id,
          event_type: "invalid_event",
          performed_by: "agent_123",
          performed_by_email: "agent@example.com",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("support_canned_responses table", () => {
    it("should create canned responses", async () => {
      if (!hasDbConnection) return;

      const { data, error } = await supabase
        .from("support_canned_responses")
        .insert({
          title: "Welcome Message",
          content: "Welcome to our support! How can I help you today?",
          category: "general",
          created_by: "admin_123",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.title).toBe("Welcome Message");
      expect(data.use_count).toBe(0);
      expect(data.is_active).toBe(true);
    });

    it("should track usage count", async () => {
      if (!hasDbConnection) return;

      // Create response
      const { data: response } = await supabase
        .from("support_canned_responses")
        .insert({
          title: "Test Response",
          content: "Test content",
          created_by: "admin_123",
        })
        .select()
        .single();

      // Increment use count
      const { error } = await supabase
        .from("support_canned_responses")
        .update({ use_count: response.use_count + 1 })
        .eq("id", response.id);

      expect(error).toBeNull();

      // Verify
      const { data: updated } = await supabase
        .from("support_canned_responses")
        .select("use_count")
        .eq("id", response.id)
        .single();

      expect(updated.use_count).toBe(1);
    });
  });

  describe("support_team_members table", () => {
    it("should create team members", async () => {
      if (!hasDbConnection) return;

      const { data, error } = await supabase
        .from("support_team_members")
        .insert({
          user_id: "agent_123",
          email: "agent@example.com",
          name: "Support Agent",
          role: "agent",
          max_open_tickets: 10,
          skills: ["billing", "technical"],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.user_id).toBe("agent_123");
      expect(data.role).toBe("agent");
      expect(data.skills).toEqual(["billing", "technical"]);
    });

    it("should enforce valid roles", async () => {
      if (!hasDbConnection) return;

      const { error } = await supabase
        .from("support_team_members")
        .insert({
          user_id: "agent_123",
          email: "agent@example.com",
          name: "Agent",
          role: "invalid_role",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("support_sla_config table", () => {
    it("should have default SLA configurations", async () => {
      if (!hasDbConnection) return;

      const { data, error } = await supabase
        .from("support_sla_config")
        .select("*")
        .eq("is_active", true);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThanOrEqual(4);

      const priorities = data.map((s) => s.priority);
      expect(priorities).toContain("urgent");
      expect(priorities).toContain("high");
      expect(priorities).toContain("medium");
      expect(priorities).toContain("low");
    });

    it("should have reasonable SLA times", async () => {
      if (!hasDbConnection) return;

      const { data: urgentSla } = await supabase
        .from("support_sla_config")
        .select("first_response_time")
        .eq("priority", "urgent")
        .single();

      const { data: lowSla } = await supabase
        .from("support_sla_config")
        .select("first_response_time")
        .eq("priority", "low")
        .single();

      // Urgent should have shorter response time than low
      expect(urgentSla.first_response_time).toBeLessThan(lowSla.first_response_time);
    });
  });

  describe("cascading deletes", () => {
    it("should cascade delete comments when ticket is deleted", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Create comment
      await supabase.from("support_ticket_comments").insert({
        ticket_id: ticket.id,
        author_id: "user_test_123",
        author_email: "test@example.com",
        is_agent: false,
        is_internal: false,
        content: "Test comment",
      });

      // Delete ticket
      await supabase.from("support_tickets").delete().eq("id", ticket.id);

      // Comment should be deleted
      const { data: comments } = await supabase
        .from("support_ticket_comments")
        .select("*")
        .eq("ticket_id", ticket.id);

      expect(comments).toHaveLength(0);
    });

    it("should cascade delete events when ticket is deleted", async () => {
      if (!hasDbConnection) return;

      // Create ticket
      const { data: ticket } = await supabase
        .from("support_tickets")
        .insert({
          user_id: "user_test_123",
          user_email: "test@example.com",
          subject: "Test",
          description: "Test",
          category: "technical",
          status: "open",
        })
        .select()
        .single();

      // Create event
      await supabase.from("support_ticket_events").insert({
        ticket_id: ticket.id,
        event_type: "created",
        performed_by: "user_test_123",
        performed_by_email: "test@example.com",
      });

      // Delete ticket
      await supabase.from("support_tickets").delete().eq("id", ticket.id);

      // Event should be deleted
      const { data: events } = await supabase
        .from("support_ticket_events")
        .select("*")
        .eq("ticket_id", ticket.id);

      expect(events).toHaveLength(0);
    });
  });
});
