INSERT INTO worker_account (id, full_name, email, balance, blocked)
VALUES ('44444444-4444-4444-4444-444444444444', 'Worker Pro Demo', 'worker2@reparando.app', 5.00, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO professional_profile (worker_id, full_name, category, rating, latitude, longitude, portfolio_images)
VALUES ('44444444-4444-4444-4444-444444444444', 'Worker Pro Demo', 'PLOMERIA', 4.9, -16.52, -68.14, 'uploads/portfolio-2.jpg')
ON CONFLICT (worker_id) DO NOTHING;
