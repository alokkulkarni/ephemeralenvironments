output "bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket_domain_name
} 