package com.testcreator.repository;

import com.testcreator.entity.Option;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for Option entity operations.
 *
 * @see Option
 */
@Repository
public interface OptionRepository extends JpaRepository<Option, Long> {

  /**
   * Finds all options for a specific question.
   *
   * @param questionId the question ID
   * @return list of options ordered by option number
   */
  List<Option> findByQuestionIdOrderByOptionNumberAsc(Long questionId);

  /**
   * Counts options for a specific question.
   *
   * @param questionId the question ID
   * @return count of options
   */
  long countByQuestionId(Long questionId);

  /**
   * Deletes all options for a question.
   *
   * @param questionId the question ID
   */
  void deleteByQuestionId(Long questionId);
}
