const express = require('express');
const router = express.Router();
require('dotenv').config()

const db = require('../db');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth')

router.get('/user', authenticate, async (req, res) => {
    const email = req.user.email;

    try {
        // Query the database to get the user's profile
        const userQuery = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
        const user = userQuery.rows[0];

        // Query the database to get the number of followers
        const followersQuery = await db.query('SELECT COUNT(*) FROM followers WHERE followed_id = $1', [user.id]);
        const numFollowers = followersQuery.rows[0].count;

        // Query the database to get the number of followings
        const followingsQuery = await db.query('SELECT COUNT(*) FROM following WHERE follower_id = $1', [user.id]);
        const numFollowings = followingsQuery.rows[0].count;

        // Return the user profile and number of followers & followings
        res.json({
            name: user.name,
            email: user.email,
            followers: numFollowers,
            followings: numFollowings
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});
// POST /api/authenticate
router.post('/authenticate', async (req, res) => {
    try {
        const { email, password } = req.body;
        const query = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await db.query(query, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];
        if (password != user.password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
        return res.status(200).json({ token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/follow/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const followerEmail = req.user.email;

        if (id == undefined){
            return res.status(400).json({ error: 'Required id to follow'});
        }
        const following = await db.query('SELECT * FROM users WHERE id = $1', [id]);

        if (req.user.id == id){
            return res.status(400).json({error:"You cannot follow yourself."})
        }
        if (following.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [follower, followingUser] = await Promise.all([
            db.query('SELECT * FROM users WHERE email = $1', [followerEmail]),
            db.query('SELECT * FROM users WHERE id = $1', [id])
        ]);

        const [followerId, followingId] = [follower.rows[0].id, followingUser.rows[0].id];

        const existingFollowing = await db.query(
            'SELECT * FROM following WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );

        if (existingFollowing.rows.length > 0) {
            return res.status(400).json({ error: 'Already following user' });
        }

        await db.query(
            'INSERT INTO following (follower_id, following_id) VALUES ($1, $2)',
            [followerId, followingId]
        );

        await db.query(
            'INSERT INTO followers (follower_id, followed_id) VALUES ($1, $2)',
            [followerId, followingId]
        );

        res.json({ message: `You are now following ${followingUser.rows[0].name}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});



router.post('/unfollow/:id', authenticate, async (req, res) => {
    const userId = req.user.id;
    const idToUnfollow = req.params.id;
    if (userId == idToUnfollow){
        return res.status(400).json({error:"You cannot unfollow yourself."});
    }
    // Check if the authenticated user follows the user with `idToUnfollow`
    const followingQuery = {
        text: 'SELECT * FROM following WHERE follower_id=$1 AND following_id=$2',
        values: [userId, idToUnfollow]
    };
    const { rows } = await db.query(followingQuery);
    if (rows.length === 0) {
        return res.status(404).json({ error: 'User is not being followed' });
    }

    // If the user is being followed, remove the relationship
    const deleteQuery = {
        text: 'DELETE FROM following WHERE follower_id=$1 AND following_id=$2 RETURNING *',
        values: [userId, idToUnfollow]
    };
    const { rowCount } = await db.query(deleteQuery);

    if (rowCount > 0) {
        // Remove from followers for the second user
        const unfollowQuery = {
            text: 'DELETE FROM followers WHERE follower_id=$1 AND followed_id=$2 RETURNING *',
            values: [idToUnfollow, userId]
        };
        await db.query(unfollowQuery);

        return res.status(200).json({ message: 'Unfollowed successfully' });
    } else {
        return res.status(500).json({ error: 'Could not unfollow user' });
    }
});



router.post('/posts', authenticate, async (req, res) => {
    const { title, description } = req.body;

    try {
        if (title == undefined || description == undefined) {
            res.status(400).json({ error: 'Please provide a title and description' });
        }
        if (title.length == 0 || description.length == 0) {
            res.status(400).json({ error: 'title and description cannot be empty' });
        }
        // Get the authenticated user's ID
        const userId = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [req.user.email]
        ).then(result => result.rows[0].id);

        // Insert the new post into the database
        const result = await db.query(
            'INSERT INTO posts (user_id, title, description) VALUES ($1, $2, $3) RETURNING id, title, description, created_at',
            [userId, title, description]
        );

        // Return the new post details
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


router.delete('/posts/:id', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    console.log(userId, postId)
    try {
        // Check if the post exists and belongs to the authenticated user
        const result = await db.query('SELECT * FROM posts WHERE id=$1 AND user_id=$2', [postId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found or you do not have permission to delete it' });
        }

        // Delete the post
        await db.query('DELETE FROM posts WHERE id=$1', [postId]);
        return res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'An error occurred while deleting the post' });
    }
});


router.post('/like/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    try {
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid post ID' });
        }
        // Check if post exists
        const post = await db.query('SELECT * FROM posts WHERE id=$1', [id]);
        if (post.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user has already liked this post
        const like = await db.query('SELECT * FROM post_likes WHERE user_id=$1 AND post_id=$2', [user_id, id]);
        if (like.rows.length > 0) {
            return res.status(400).json({ error: 'You have already liked this post' });
        }

        // Add like
        const result = await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) RETURNING *', [user_id, id]);

        res.json("success");
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


router.post('/unlike/:id', authenticate, async (req, res) => {
    const postId = req.params.id;

    const userId = req.user.id;
    try {
        // Validate that postId is a number
        if (isNaN(postId)) {
            return res.status(400).json({ message: 'Invalid post ID' });
        }


        // Check if the user has liked the post
        const queryResult = await db.query(
            'SELECT * FROM post_likes WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        if (queryResult.rowCount === 0) {
            return res.status(404).json({ message: 'Post not found or not liked by user' });
        }

        // Unlike the post
        await db.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);

        // Send success response
        return res.status(200).json({ message: 'Post unliked successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.post('/comment/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const userId = req.user.id;

        if (comment == undefined) {
            res.status(400).json({ message: 'Please provide a comment' });
        }
        // Check if the post exists
        const postExists = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
        if (postExists.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Insert the comment into the database
        const result = await db.query(
            'INSERT INTO post_comments (user_id, post_id, comment) VALUES ($1, $2, $3) RETURNING *',
            [userId, id, comment]
        );

        const commentId = result.rows[0].id;

        res.status(201).json({
            comment_id: commentId,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});


router.get('/posts/:id', authenticate, async (req, res) => {
    try {
        const postId = req.params.id;
        const postQuery = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        const post = postQuery.rows[0];

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const likesQuery = await db.query('SELECT COUNT(*) FROM post_likes WHERE post_id = $1', [postId]);
        const likes = likesQuery.rows[0].count;

        const commentsQuery = await db.query('SELECT COUNT(*) FROM post_comments WHERE post_id = $1', [postId]);
        const comments = commentsQuery.rows[0].count;

        const postWithLikesAndComments = {
            id: post.id,
            title: post.title,
            description: post.description,
            created_at: post.created_at,
            likes: likes,
            comments: comments
        };

        res.json(postWithLikesAndComments);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Internal Server error' });
    }
});


router.get('/all_posts', authenticate, async (req, res) => {
    const user = req.user;
    try {
      const posts = await db.query(`
        SELECT posts.id, posts.title, posts.description, posts.created_at, COUNT(post_comments.id) as comments, COUNT(post_likes.id) as likes
        FROM posts
        LEFT JOIN post_comments ON post_comments.post_id = posts.id
        LEFT JOIN post_likes ON post_likes.post_id = posts.id
        WHERE posts.user_id = $1
        GROUP BY posts.id
        ORDER BY posts.created_at DESC
      `, [user.id]);
  
      res.json(posts.rows);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  
module.exports = router;