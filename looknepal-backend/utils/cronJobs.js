const cron = require('node-cron');
const Job = require('../models/Job');
const User = require('../models/User');
const Company = require('../models/Company');
const { sendEmail } = require('./email');

const sendWeeklyJobDigests = async () => {
    console.log('[CRON] Starting weekly job digest dispatch...');
    try {
        // Find jobs posted in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentJobs = await Job.find({
            createdAt: { $gte: sevenDaysAgo },
            status: 'active'
        }).populate('company', 'name');

        if (recentJobs.length === 0) {
            console.log('[CRON] No new jobs this week to email about.');
            return;
        }

        // Fetch all active job seekers who have completed onboarding
        const jobSeekers = await User.find({
            userType: 'job_seeker',
            isActive: true,
            // (Optional) only those who opted in, etc.
        });

        console.log(`[CRON] Found ${recentJobs.length} new jobs. Preparing to email ${jobSeekers.length} job seekers.`);

        let dispatchCount = 0;

        for (const user of jobSeekers) {
            // Simplified algorithm: Just show them top 5 recent jobs for now
            // Future phase: implement personalization based on user.preferences / user.skills!
            const topJobs = recentJobs.slice(0, 5);

            let htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0e46a3;">Hi ${user.firstName},</h2>
                    <p>Here are the top new opportunities on Look Nepal this week!</p>
                    <hr />
                    <ul style="list-style: none; padding: 0;">
            `;

            topJobs.forEach(job => {
                htmlContent += `
                    <li style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <h3 style="margin: 0; color: #2D2D2D;">${job.title}</h3>
                        <p style="margin: 5px 0;"><strong>${job.company?.name || 'Top Employer'}</strong> - ${job.location?.city || 'Remote'}</p>
                        <a href="http://localhost:8081/job-details.html?id=${job._id}" style="color: #0e46a3; display: inline-block; margin-top: 5px;">View Job &rarr;</a>
                    </li>
                `;
            });

            htmlContent += `
                    </ul>
                    <p style="margin-top: 20px;">Keep your profile updated to get better matches.</p>
                    <p>Best regards,<br/>The Look Nepal Team</p>
                </div>
            `;

            await sendEmail({
                to: user.email,
                subject: 'Your Weekly Look Nepal Job Digest',
                html: htmlContent
            });

            dispatchCount++;
        }

        console.log(`[CRON] Successfully dispatched ${dispatchCount} weekly digests.`);
    } catch (error) {
        console.error('[CRON] Error dispatching weekly digests:', error);
    }
};

const initCronJobs = () => {
    // Run every Monday at 8:00 AM -> '0 8 * * 1'
    cron.schedule('0 8 * * 1', () => {
        sendWeeklyJobDigests();
    });
    console.log('[CRON] Weekly Job Digest scheduler initialized (Runs Every Monday at 8:00 AM).');
};

module.exports = {
    initCronJobs,
    sendWeeklyJobDigests // Exported for manual testing if needed
};
