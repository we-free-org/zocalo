-- Fix RLS policy for conversation_participants to allow creating conversations with other users
DROP POLICY IF EXISTS "Users can insert themselves as conversation participants" ON conversation_participants;

-- Allow users to add participants when they are the conversation creator or when adding themselves
CREATE POLICY "Users can manage conversation participants" ON conversation_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR -- User can add themselves
        conversation_id IN ( -- Or user is the creator of the conversation
            SELECT id FROM conversations 
            WHERE created_by = auth.uid()
        )
    ); 